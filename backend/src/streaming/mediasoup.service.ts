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
import { networkInterfaces } from 'os';

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);
  private workers: Worker[] = [];
  private routers = new Map<string, Router>(); // sessionId -> Router
  private transports = new Map<string, { transport: Transport; router: Router }>(); // transportId -> { transport, router }
  private producers = new Map<string, { producer: Producer; router: Router }>(); // producerId -> { producer, router }
  private nextWorkerIndex = 0;
  private readonly numWorkers = 1; // Start with 1 worker, scale as needed
  private announcedIp: string | undefined;

  async onModuleInit() {
    await this.createWorkers();
    this.announcedIp = await this.detectAnnouncedIp();
  }

  private async detectAnnouncedIp(): Promise<string | undefined> {
    // If explicitly set in env, use it
    if (process.env.MEDIASOUP_ANNOUNCED_IP) {
      return process.env.MEDIASOUP_ANNOUNCED_IP;
    }

    // Auto-detect: Get first non-internal IPv4 address
    const interfaces = networkInterfaces();
    
    for (const interfaceName in interfaces) {
      const addresses = interfaces[interfaceName];
      if (!addresses) continue;

      for (const addr of addresses) {
        // Skip internal (127.0.0.1) and IPv6 addresses
        if (addr.family === 'IPv4' && !addr.internal) {
          this.logger.log(
            `Auto-detected MEDIASOUP_ANNOUNCED_IP: ${addr.address} (${interfaceName})`,
          );
          return addr.address;
        }
      }
    }

    // Fallback: Use listen IP if configured, otherwise use 127.0.0.1
    const listenIp = process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1';
    this.logger.warn(
      `Could not auto-detect announced IP. Using listen IP: ${listenIp}`,
    );
    return listenIp === '0.0.0.0' ? undefined : listenIp;
  }

  async onModuleDestroy() {
    // Cleanup
    for (const router of this.routers.values()) {
      router.close();
    }
    this.routers.clear();

    for (const transportData of this.transports.values()) {
      transportData.transport.close();
    }
    this.transports.clear();

    this.producers.clear();

    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
  }

  private async createWorkers() {
    const { numWorkers } = process.env;
    const workerCount = numWorkers ? parseInt(numWorkers, 10) : this.numWorkers;

    for (let i = 0; i < workerCount; i++) {
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

      this.workers.push(worker);
      this.logger.log(`Mediasoup worker ${i} created [pid:${worker.pid}]`);
    }
  }

  private getWorker(): Worker {
    if (this.workers.length === 0) {
      throw new Error('No mediasoup workers available');
    }
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(sessionId: string): Promise<Router> {
    if (this.routers.has(sessionId)) {
      return this.routers.get(sessionId)!;
    }

    const worker = this.getWorker();
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

    this.routers.set(sessionId, router);
    this.logger.log(`Router created for session ${sessionId}`);

    return router;
  }

  async getRouterRtpCapabilities(
    sessionId: string,
  ): Promise<RtpCapabilities> {
    const router = await this.createRouter(sessionId);
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
    const router = await this.createRouter(sessionId);
    const worker = router.appData.worker as Worker;

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

    this.transports.set(transport.id, { transport, router });

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

  async createProducer(
    sessionId: string,
    transportId: string,
    rtpParameters: any,
  ): Promise<Producer> {
    const transportData = this.transports.get(transportId);
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producer = await transportData.transport.produce({ 
      kind: rtpParameters.kind, 
      rtpParameters 
    });

    producer.on('transportclose', () => {
      this.producers.delete(producer.id);
      this.logger.log(`Producer closed: ${producer.id}`);
    });

    this.producers.set(producer.id, { producer, router: transportData.router });
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

    const router = await this.createRouter(sessionId);
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
    const router = this.routers.get(sessionId);
    if (!router) {
      return [];
    }

    // Get all producers that belong to this router
    const routerProducers: Producer[] = [];
    for (const producerData of this.producers.values()) {
      if (producerData.router === router) {
        routerProducers.push(producerData.producer);
      }
    }
    return routerProducers;
  }

  async closeSession(sessionId: string): Promise<void> {
    const router = this.routers.get(sessionId);
    if (router) {
      // Close all transports in this router
      for (const [transportId, transportData] of this.transports.entries()) {
        if (transportData.router === router) {
          transportData.transport.close();
          this.transports.delete(transportId);
        }
      }

      // Remove all producers for this router
      for (const [producerId, producerData] of this.producers.entries()) {
        if (producerData.router === router) {
          producerData.producer.close();
          this.producers.delete(producerId);
        }
      }

      router.close();
      this.routers.delete(sessionId);
      this.logger.log(`Session ${sessionId} closed`);
    }
  }
}

