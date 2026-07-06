import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  Producer,
  Router,
  RtpCapabilities,
  Transport,
  Worker,
} from 'mediasoup/types';
import { createWorker } from 'mediasoup';
import { getRecommendedLanIp } from '../common/utils/network-address.util';
import type { MediasoupRoom, MediasoupRoomId } from './mediasoup.types';

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);

  /**
   * Single mediasoup worker reused across all streams.
   */
  private worker: Worker | null = null;

  /**
   * Single router reused across all sessions/streams (SFU model).
   */
  private router: Router | null = null;

  /**
   * Transports keyed by transportId and tagged with sessionId for cleanup.
   */
  private transports = new Map<string, { transport: Transport; sessionId: string }>();

  /**
   * Producers keyed by producerId and tagged with sessionId for cleanup and discovery.
   */
  private producers = new Map<string, { producer: Producer; sessionId: string }>();

  /**
   * Optional room map for future room-based signaling (not yet wired
   * into existing streaming flows). This provides a clean API for
   * HTTP/WebSocket signaling around logical "rooms".
   */
  private rooms = new Map<MediasoupRoomId, MediasoupRoom>();

  private announcedIp: string | undefined;

  async onModuleInit() {
    // Create a single worker and router on bootstrap.
    await this.createWorkerInstance();
    this.announcedIp = await this.detectAnnouncedIp();
    await this.createRouter();
  }

  private async detectAnnouncedIp(): Promise<string | undefined> {
    if (process.env.MEDIASOUP_ANNOUNCED_IP) {
      return process.env.MEDIASOUP_ANNOUNCED_IP;
    }

    const recommended = getRecommendedLanIp();
    if (recommended) {
      this.logger.log(
        `Auto-detected MEDIASOUP_ANNOUNCED_IP: ${recommended} (LAN preferred over VPN)`,
      );
      return recommended;
    }

    const listenIp = process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1';
    this.logger.warn(
      `Could not auto-detect announced IP. Using listen IP: ${listenIp}`,
    );
    return listenIp === '0.0.0.0' ? undefined : listenIp;
  }

  async onModuleDestroy() {
    // Cleanup all mediasoup resources on shutdown
    for (const transportData of this.transports.values()) {
      transportData.transport.close();
    }
    this.transports.clear();

    for (const producerData of this.producers.values()) {
      producerData.producer.close();
    }
    this.producers.clear();

    if (this.router) {
      this.router.close();
      this.router = null;
    }

    if (this.worker) {
      this.worker.close();
      this.worker = null;
    }
  }

  /**
   * Create the single mediasoup worker instance (idempotent).
   */
  private async createWorkerInstance(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    const worker = await createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    worker.on('died', () => {
      this.logger.error('Mediasoup worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    this.worker = worker;
    this.logger.log(`Mediasoup worker created [pid:${worker.pid}]`);

    return worker;
  }

  /**
   * Create or return the single router instance.
   * All sessions/streams share the same router (SFU model).
   */
  async createRouter(): Promise<Router> {
    if (this.router) {
      return this.router;
    }

    const worker = await this.createWorkerInstance();
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio' as MediaKind,
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video' as MediaKind,
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video' as MediaKind,
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video' as MediaKind,
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    this.router = router;
    this.logger.log('Mediasoup router created (shared across sessions)');

    return router;
  }

  /**
   * Create a mediasoup room using the shared router and in-memory
   * maps for transports/producers/consumers. This is intentionally
   * minimal and does not persist to any external storage.
   */
  async createRoom(roomId: MediasoupRoomId): Promise<MediasoupRoom> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    const router = await this.createRouter();
    const room: MediasoupRoom = {
      id: roomId,
      router,
      transports: new Map<string, Transport>(),
      producers: new Map<string, Producer>(),
      consumers: new Map<string, any>(),
    };

    this.rooms.set(roomId, room);
    this.logger.log(`Mediasoup room created: ${roomId}`);

    return room;
  }

  /**
   * Get an existing room or create a new one if missing.
   */
  async getOrCreateRoom(roomId: MediasoupRoomId): Promise<MediasoupRoom> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }
    return this.createRoom(roomId);
  }

  /**
   * Create a WebRTC transport for a given room. This is a convenience
   * wrapper around the existing transport creation logic which uses a
   * single shared router.
   */
  async createWebRtcTransportForRoom(
    roomId: MediasoupRoomId,
    direction: 'send' | 'recv',
    userId: string,
  ): Promise<{
    transport: Transport;
    params: {
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate[];
      dtlsParameters: DtlsParameters;
    };
  }> {
    const room = await this.getOrCreateRoom(roomId);
    const { transport, params } = await this.createWebRtcTransport(
      roomId,
      direction === 'send' ? 'producer' : 'consumer',
    );

    room.transports.set(params.id, transport);

    return { transport, params };
  }

  /**
   * Associate an existing producer with a room. Existing streaming flows
   * still use the sessionId-based maps; this is purely additive for
   * room-based APIs.
   */
  async addProducerToRoom(
    roomId: MediasoupRoomId,
    producer: Producer,
  ): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.producers.set(producer.id, producer);
  }

  async getRouterRtpCapabilities(
    sessionId: string,
  ): Promise<RtpCapabilities> {
    // sessionId is accepted for API compatibility but ignored internally,
    // since a single router is reused across all sessions.
    const router = await this.createRouter();
    return router.rtpCapabilities;
  }

  async createWebRtcTransport(
    sessionId: string,
    type: 'producer' | 'consumer',
  ): Promise<{
    transport: Transport;
    params: {
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate[];
      dtlsParameters: DtlsParameters;
    };
  }> {
    const router = await this.createRouter();

    const listenIp = process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1';
    const announcedIp = this.announcedIp;

    const listenIps = [{ ip: listenIp, announcedIp }];

    const transport = await router.createWebRtcTransport({
      listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    });

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        this.logger.log(`Transport closed for session ${sessionId}`);
        transport.close();
        this.transports.delete(transport.id);
      }
    });

    transport.on('@close', () => {
      this.transports.delete(transport.id);
      this.logger.log(`Transport closed and removed: ${transport.id}`);
    });

    // Tag transport with sessionId so we can clean it up when session ends.
    this.transports.set(transport.id, { transport, sessionId });

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  async connectTransport(
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }
    await transportData.transport.connect({ dtlsParameters });
  }

  /**
   * Create a producer on the shared router.
   * Enforces a single VP8 video codec and removes simulcast/SVC encodings.
   */
  async createProducer(
    sessionId: string,
    transportId: string,
    rtpParameters: any,
  ): Promise<Producer> {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const sanitizedRtpParameters = this.sanitizeRtpParameters(rtpParameters);

    const producer = await transportData.transport.produce({
      // rtpParameters.kind may be set by the client; fall back to 'video'
      kind: sanitizedRtpParameters.kind || 'video',
      rtpParameters: sanitizedRtpParameters,
    });

    producer.on('transportclose', () => {
      this.producers.delete(producer.id);
      this.logger.log(`Producer closed: ${producer.id}`);
    });

    this.producers.set(producer.id, { producer, sessionId });
    this.logger.log(`Producer created: ${producer.id} for session ${sessionId}`);

    return producer;
  }

  async createConsumer(
    sessionId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<{
    consumer: any;
    params: any;
  }> {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producerData = this.producers.get(producerId);
    if (!producerData) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    const router = await this.createRouter();
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume producer');
    }

    const consumer = await transportData.transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    return {
      consumer,
      params: {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      },
    };
  }

  async getProducers(sessionId: string): Promise<Producer[]> {
    // Filter producers by sessionId while still sharing the same router.
    const sessionProducers: Producer[] = [];
    for (const data of this.producers.values()) {
      if (data.sessionId === sessionId) {
        sessionProducers.push(data.producer);
      }
    }
    return sessionProducers;
  }

  async closeSession(sessionId: string): Promise<void> {
    // Close all transports and producers associated with the given sessionId,
    // but keep the shared router/worker alive for other sessions.
    for (const [transportId, transportData] of this.transports.entries()) {
      if (transportData.sessionId === sessionId) {
        transportData.transport.close();
        this.transports.delete(transportId);
      }
    }

    for (const [producerId, producerData] of this.producers.entries()) {
      if (producerData.sessionId === sessionId) {
        producerData.producer.close();
        this.producers.delete(producerId);
      }
    }

    this.logger.log(`Session ${sessionId} closed (resources cleaned up)`);
  }

  /**
   * Sanitize incoming RTP parameters to ensure a single VP8 video codec and
   * remove simulcast/SVC encodings and unnecessary RTP parameters.
   */
  private sanitizeRtpParameters(rtpParameters: any): any {
    if (!rtpParameters || typeof rtpParameters !== 'object') {
      return rtpParameters;
    }

    const cloned: any = { ...rtpParameters };

    if (Array.isArray(cloned.codecs)) {
      cloned.codecs = cloned.codecs.filter(
        (codec: any) =>
          codec &&
          typeof codec.mimeType === 'string' &&
          codec.mimeType.toLowerCase() === 'video/vp8',
      );
    }

    if (Array.isArray(cloned.encodings)) {
      cloned.encodings = cloned.encodings.length > 0 ? [cloned.encodings[0]] : [];
    }

    return cloned;
  }
}
