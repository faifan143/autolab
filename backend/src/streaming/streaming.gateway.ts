import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/types';
import { StreamingService } from './streaming.service';
import { MediasoupService } from './mediasoup.service';
import { ServerRecordingService } from './server-recording.service';

@WebSocketGateway({
  namespace: '/ws/streaming',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class StreamingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(StreamingGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly streamingService: StreamingService,
    private readonly mediasoupService: MediasoupService,
    private readonly serverRecordingService: ServerRecordingService,
  ) {}

  async handleConnection(client: Socket) {
    // Extract user info from auth token if provided
    // In production, you should validate JWT token here
    const userId = client.handshake.auth?.userId;
    const userRole = client.handshake.auth?.role;

    if (!userId) {
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    client.data.userRole = userRole;

    console.log(`Streaming client connected: ${userId}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const sessionId = client.data.sessionId;

    if (sessionId) {
      await this.streamingService.handleStreamDisconnect(
        sessionId,
        userId,
        client.data.isPublisher,
      );
    }

    console.log(`Streaming client disconnected: ${userId}`);
  }

  @SubscribeMessage('get-router-rtp-capabilities')
  async handleGetRouterRtpCapabilities(
    client: Socket,
    payload: { sessionId: string },
  ) {
    const { sessionId } = payload;
    const userId = client.data.userId;
    const userRole = client.data.userRole;

    try {
      const canJoin = await this.streamingService.canJoinStream(
        sessionId,
        userId,
        userRole,
      );

      if (!canJoin) {
        client.emit('stream-error', {
          message: 'Unauthorized to join this stream',
        });
        return;
      }

      const rtpCapabilities =
        await this.mediasoupService.getRouterRtpCapabilities(sessionId);

      client.emit('router-rtp-capabilities', {
        sessionId,
        rtpCapabilities,
      });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to get capabilities',
      });
    }
  }

  @SubscribeMessage('create-transport')
  async handleCreateTransport(
    client: Socket,
    payload: { sessionId: string; type: 'producer' | 'consumer' },
  ) {
    const { sessionId, type } = payload;
    const userId = client.data.userId;
    const userRole = client.data.userRole;

    try {
      const canJoin = await this.streamingService.canJoinStream(
        sessionId,
        userId,
        userRole,
      );

      if (!canJoin) {
        client.emit('stream-error', {
          message: 'Unauthorized to join this stream',
        });
        return;
      }

      const { transport, params } =
        await this.mediasoupService.createWebRtcTransport(sessionId, type);

      client.data.transports = client.data.transports || {};
      client.data.transports[params.id] = { transport, type };

      client.join(`session:${sessionId}`);
      client.data.sessionId = sessionId;

      client.emit('transport-created', {
        sessionId,
        transportId: params.id,
        params,
      });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to create transport',
      });
    }
  }

  @SubscribeMessage('connect-transport')
  async handleConnectTransport(
    client: Socket,
    payload: { transportId: string; dtlsParameters: DtlsParameters },
  ) {
    const { transportId, dtlsParameters } = payload;

    try {
      await this.mediasoupService.connectTransport(transportId, dtlsParameters);

      client.emit('transport-connected', { transportId });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to connect transport',
      });
    }
  }

  @SubscribeMessage('produce')
  async handleProduce(
    client: Socket,
    payload: {
      sessionId: string;
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: RtpParameters;
    },
  ) {
    const { sessionId, transportId, kind, rtpParameters } = payload;
    const userId = client.data.userId;
    const userRole = client.data.userRole;

    try {
      const canPublish = await this.streamingService.canPublishStream(
        sessionId,
        userId,
        userRole,
      );

      if (!canPublish) {
        client.emit('stream-error', {
          message: 'Unauthorized to publish stream',
        });
        return;
      }

      const producer = await this.mediasoupService.createProducer(
        sessionId,
        transportId,
        { ...rtpParameters, kind },
      );

      // Recording startup must never delay live publish acknowledgments.
      void this.serverRecordingService
        .maybeStartSessionRecording(sessionId)
        .catch(() => undefined);

      // Store publisher connection
      await this.streamingService.setStreamPublisher(sessionId, userId);

      client.data.isPublisher = true;
      client.data.producerId = producer.id;

      client.emit('produced', {
        sessionId,
        producerId: producer.id,
        kind: producer.kind,
      });

      // Notify all students that stream started
      this.server.to(`session:${sessionId}`).emit('stream-started', {
        sessionId,
        producerId: producer.id,
        kind: producer.kind,
      });

      // Notify all students in the lab
      await this.streamingService.notifyStreamStarted(sessionId);
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to produce',
      });
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(
    client: Socket,
    payload: {
      sessionId: string;
      transportId: string;
      producerId: string;
      rtpCapabilities: RtpCapabilities;
    },
  ) {
    const { sessionId, transportId, producerId, rtpCapabilities } = payload;

    try {
      const { consumer, params } = await this.mediasoupService.createConsumer(
        sessionId,
        transportId,
        producerId,
        rtpCapabilities,
      );

      client.data.consumers = client.data.consumers || {};
      client.data.consumers[consumer.id] = consumer;

      this.logger.log(
        `Consumer created: sessionId=${sessionId} studentId=${client.data.userId} consumerId=${consumer.id} producerId=${consumer.producerId} kind=${consumer.kind} paused=true`,
      );

      client.emit('consumed', {
        sessionId,
        consumerId: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        // Client must call resume-consumer after attaching the local track.
        paused: true,
      });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to consume',
      });
    }
  }

  @SubscribeMessage('resume-consumer')
  async handleResumeConsumer(
    client: Socket,
    payload: { consumerId: string },
  ) {
    const { consumerId } = payload;

    try {
      const consumer = client.data.consumers?.[consumerId];
      if (!consumer) {
        client.emit('stream-error', {
          message: `Consumer not found: ${consumerId}`,
        });
        return;
      }

      await this.mediasoupService.resumeConsumerInstance(consumer);
      this.logger.log(
        `Consumer resumed: sessionId=${client.data.sessionId} studentId=${client.data.userId} consumerId=${consumerId}`,
      );
      client.emit('consumer-resumed', { consumerId });
    } catch (error) {
      client.emit('stream-error', {
        message:
          error instanceof Error ? error.message : 'Failed to resume consumer',
      });
    }
  }

  @SubscribeMessage('get-producers')
  async handleGetProducers(client: Socket, payload: { sessionId: string }) {
    const { sessionId } = payload;

    try {
      const producers = await this.mediasoupService.getProducers(sessionId);

      client.emit('producers', {
        sessionId,
        producers: producers.map((p) => ({
          id: p.id,
          kind: p.kind,
        })),
      });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to get producers',
      });
    }
  }

  @SubscribeMessage('stop-stream')
  async handleStopStream(client: Socket, payload: { sessionId: string }) {
    const { sessionId } = payload;
    const userId = client.data.userId;

    try {
      await this.streamingService.stopStream(sessionId, userId);
      await this.serverRecordingService.stopSessionRecording(sessionId);
      await this.mediasoupService.closeSession(sessionId);

      // Notify all subscribers
      this.server.to(`session:${sessionId}`).emit('stream-stopped', {
        sessionId,
      });

      client.emit('stream-stopped-ack', { sessionId });
    } catch (error) {
      client.emit('stream-error', {
        message: error instanceof Error ? error.message : 'Failed to stop stream',
      });
    }
  }

  emitStreamStarted(sessionId: string, labId: string) {
    this.server.to(`session:${sessionId}`).emit('stream-started-notification', {
      sessionId,
      labId,
    });
  }
}

