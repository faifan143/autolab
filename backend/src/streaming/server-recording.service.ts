import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createSocket } from 'node:dgram';
import type { Consumer, PlainTransport, Producer, Router } from 'mediasoup/types';
import { MediasoupService } from './mediasoup.service';

type RecordingState = {
  sessionId: string;
  startedAt: number;
  outputPath: string;
  sdpPath: string;
  ffmpeg: ChildProcess;
  videoTransport: PlainTransport;
  videoConsumer: Consumer;
  audioTransport?: PlainTransport;
  audioConsumer?: Consumer;
};

@Injectable()
export class ServerRecordingService implements OnModuleDestroy {
  private readonly logger = new Logger(ServerRecordingService.name);
  private readonly recordings = new Map<string, RecordingState>();
  private readonly pendingStartTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly mediasoupService: MediasoupService) {}

  private get recordingsDir(): string {
    return join(process.cwd(), 'uploads', 'stream-recordings');
  }

  async onModuleDestroy() {
    for (const timer of this.pendingStartTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingStartTimers.clear();

    for (const sessionId of this.recordings.keys()) {
      await this.stopSessionRecording(sessionId);
    }
  }

  async maybeStartSessionRecording(
    sessionId: string,
    allowVideoOnlyFallback = false,
  ): Promise<void> {
    if (this.recordings.has(sessionId)) return;

    const videoProducer = this.mediasoupService.getLatestProducerByKind(
      sessionId,
      'video',
    );
    if (!videoProducer) return;

    const audioProducer = this.mediasoupService.getLatestProducerByKind(
      sessionId,
      'audio',
    );
    if (!audioProducer && !allowVideoOnlyFallback) {
      this.logger.log(
        `Waiting briefly for audio producer before recording session ${sessionId}`,
      );
      this.scheduleVideoOnlyFallback(sessionId);
      return;
    }
    if (!audioProducer && allowVideoOnlyFallback) {
      this.logger.warn(
        `Starting video-only recording for session ${sessionId} (audio producer unavailable)`,
      );
    }

    const pendingTimer = this.pendingStartTimers.get(sessionId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.pendingStartTimers.delete(sessionId);
    }

    const router = await this.mediasoupService.createRouter();
    await mkdir(this.recordingsDir, { recursive: true });

    const ts = Date.now();
    const outputPath = join(this.recordingsDir, `${sessionId}-${ts}.mp4`);
    const sdpPath = join(this.recordingsDir, `${sessionId}-${ts}.sdp`);

    const videoPorts = await this.allocateRtpPorts();
    const videoTransport = await this.createTransportToPort(
      router,
      videoPorts.rtp,
      videoPorts.rtcp,
    );
    const videoConsumer = await this.createConsumer(router, videoTransport, videoProducer);

    let audioTransport: PlainTransport | undefined;
    let audioConsumer: Consumer | undefined;
    let audioPorts: { rtp: number; rtcp: number } | null = null;
    if (audioProducer) {
      audioPorts = await this.allocateRtpPorts();
      audioTransport = await this.createTransportToPort(
        router,
        audioPorts.rtp,
        audioPorts.rtcp,
      );
      audioConsumer = await this.createConsumer(router, audioTransport, audioProducer);
    }

    const sdp = this.buildSdp({
      videoProducer,
      videoConsumer,
      videoPorts,
      audioProducer,
      audioConsumer,
      audioPorts,
    });
    await writeFile(sdpPath, sdp, 'utf8');

    let ffmpeg: ChildProcess;
    try {
      ffmpeg = await this.spawnFfmpeg(sdpPath, outputPath);
    } catch (error) {
      videoConsumer.close();
      videoTransport.close();
      audioConsumer?.close();
      audioTransport?.close();
      await rm(sdpPath, { force: true }).catch(() => undefined);
      this.logger.error(
        `Failed to start recorder for session ${sessionId}. Install ffmpeg or set FFMPEG_PATH.`,
      );
      this.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }

    this.recordings.set(sessionId, {
      sessionId,
      startedAt: ts,
      outputPath,
      sdpPath,
      ffmpeg,
      videoTransport,
      videoConsumer,
      audioTransport,
      audioConsumer,
    });

    setTimeout(() => {
      void videoConsumer.resume().catch(() => undefined);
      try {
        (videoConsumer as any).requestKeyFrame?.();
      } catch {
        // optional API across mediasoup versions
      }
      void audioConsumer?.resume().catch(() => undefined);
    }, 350);

    this.logger.log(`Server recording started for session ${sessionId}`);
  }

  private scheduleVideoOnlyFallback(sessionId: string): void {
    if (this.pendingStartTimers.has(sessionId)) return;
    const timer = setTimeout(() => {
      this.pendingStartTimers.delete(sessionId);
      void this.maybeStartSessionRecording(sessionId, true);
    }, 4000);
    this.pendingStartTimers.set(sessionId, timer);
  }

  async stopSessionRecording(sessionId: string): Promise<string | null> {
    const pendingTimer = this.pendingStartTimers.get(sessionId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.pendingStartTimers.delete(sessionId);
    }

    const state = this.recordings.get(sessionId);
    if (!state) return null;

    this.recordings.delete(sessionId);

    await this.stopFfmpeg(state.ffmpeg);

    try {
      state.videoConsumer.close();
      state.videoTransport.close();
      state.audioConsumer?.close();
      state.audioTransport?.close();
    } catch {
      // best effort
    }

    await rm(state.sdpPath, { force: true }).catch(() => undefined);

    this.logger.log(`Server recording stopped for session ${sessionId}`);
    return state.outputPath;
  }

  async findLatestRecordingPath(sessionId: string): Promise<string | null> {
    const { readdir, stat } = await import('node:fs/promises');
    try {
      const entries = await readdir(this.recordingsDir, { withFileTypes: true });
      const matches: Array<{ path: string; mtime: number }> = [];
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.mp4')) continue;
        if (!entry.name.startsWith(`${sessionId}-`)) continue;
        const fullPath = join(this.recordingsDir, entry.name);
        const info = await stat(fullPath);
        if (info.size <= 0) continue;
        matches.push({ path: fullPath, mtime: info.mtimeMs });
      }
      matches.sort((a, b) => b.mtime - a.mtime);
      return matches[0]?.path ?? null;
    } catch {
      return null;
    }
  }

  private async createTransportToPort(
    router: Router,
    rtpPort: number,
    rtcpPort: number,
  ): Promise<PlainTransport> {
    const transport = await router.createPlainTransport({
      listenIp: { ip: '127.0.0.1' },
      rtcpMux: false,
      comedia: false,
    });

    await transport.connect({
      ip: '127.0.0.1',
      port: rtpPort,
      rtcpPort,
    });

    return transport;
  }

  private async createConsumer(
    router: Router,
    transport: PlainTransport,
    producer: Producer,
  ): Promise<Consumer> {
    if (
      !router.canConsume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
      })
    ) {
      throw new Error(`Cannot consume producer ${producer.id} for recording`);
    }
    return transport.consume({
      producerId: producer.id,
      rtpCapabilities: router.rtpCapabilities,
      paused: true,
    });
  }

  private buildSdp(params: {
    videoProducer: Producer;
    videoConsumer: Consumer;
    videoPorts: { rtp: number; rtcp: number };
    audioProducer: Producer | null;
    audioConsumer?: Consumer;
    audioPorts: { rtp: number; rtcp: number } | null;
  }): string {
    const videoCodec = params.videoConsumer.rtpParameters.codecs[0];
    const videoEnc = params.videoConsumer.rtpParameters.encodings?.[0];
    if (!videoCodec || !videoEnc?.ssrc) {
      throw new Error('Missing video RTP parameters for recorder');
    }
    const videoCodecName = this.normalizeCodecName(videoCodec.mimeType);

    const lines = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=AutoLab server recording',
      't=0 0',
      `m=video ${params.videoPorts.rtp} RTP/AVP ${videoCodec.payloadType}`,
      'c=IN IP4 127.0.0.1',
      `a=rtcp:${params.videoPorts.rtcp}`,
      `a=rtpmap:${videoCodec.payloadType} ${videoCodecName}/${videoCodec.clockRate}`,
      ...this.buildFmtpLines(videoCodec.payloadType, videoCodec.parameters),
      `a=ssrc:${videoEnc.ssrc} cname:autolab-video`,
      'a=recvonly',
    ];

    if (params.audioProducer && params.audioConsumer && params.audioPorts) {
      const audioCodec = params.audioConsumer.rtpParameters.codecs[0];
      const audioEnc = params.audioConsumer.rtpParameters.encodings?.[0];
      if (audioCodec && audioEnc?.ssrc) {
        const audioCodecName = this.normalizeCodecName(audioCodec.mimeType);
        const channels = audioCodec.channels ? `/${audioCodec.channels}` : '';
        lines.push(
          `m=audio ${params.audioPorts.rtp} RTP/AVP ${audioCodec.payloadType}`,
          'c=IN IP4 127.0.0.1',
          `a=rtcp:${params.audioPorts.rtcp}`,
          `a=rtpmap:${audioCodec.payloadType} ${audioCodecName}/${audioCodec.clockRate}${channels}`,
          ...this.buildFmtpLines(audioCodec.payloadType, audioCodec.parameters),
          `a=ssrc:${audioEnc.ssrc} cname:autolab-audio`,
          'a=recvonly',
        );
      }
    }

    return `${lines.join('\n')}\n`;
  }

  private async spawnFfmpeg(sdpPath: string, outputPath: string): Promise<ChildProcess> {
    const ffmpeg = spawn(
      process.env.FFMPEG_PATH || 'ffmpeg',
      [
        '-y',
        '-protocol_whitelist',
        'file,udp,rtp',
        '-fflags',
        '+genpts',
        '-f',
        'sdp',
        '-i',
        sdpPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    ffmpeg.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      const trimmed = text.trim();
      if (trimmed.length > 0) this.logger.log(`[ffmpeg] ${trimmed}`);
    });

    ffmpeg.on('exit', (code) => {
      this.logger.log(`ffmpeg recorder exited with code ${code ?? -1}`);
    });

    return new Promise<ChildProcess>((resolve, reject) => {
      let settled = false;
      const onError = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const onSpawn = () => {
        if (settled) return;
        settled = true;
        resolve(ffmpeg);
      };
      ffmpeg.once('error', onError);
      ffmpeg.once('spawn', onSpawn);
    });
  }

  private async stopFfmpeg(ffmpeg: ChildProcess): Promise<void> {
    if (ffmpeg.killed || ffmpeg.exitCode !== null) return;

    // Ask ffmpeg to finalize outputs gracefully before signaling.
    try {
      ffmpeg.stdin?.write('q\n');
      ffmpeg.stdin?.end();
    } catch {
      // ignore
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (ffmpeg.exitCode === null) {
          ffmpeg.kill('SIGINT');
        }
      }, 3000);
      const hardTimeout = setTimeout(() => {
        if (ffmpeg.exitCode === null) {
          ffmpeg.kill('SIGKILL');
        }
        resolve();
      }, 7000);
      ffmpeg.once('exit', () => {
        clearTimeout(timeout);
        clearTimeout(hardTimeout);
        resolve();
      });
    });
  }

  private normalizeCodecName(mimeType: string): string {
    const codec = mimeType.split('/')[1]?.toUpperCase() ?? '';
    if (codec === 'H264') return 'H264';
    if (codec === 'VP8') return 'VP8';
    if (codec === 'VP9') return 'VP9';
    if (codec === 'OPUS') return 'OPUS';
    return codec || 'VP8';
  }

  private buildFmtpLines(
    payloadType: number,
    parameters: Record<string, unknown> | undefined,
  ): string[] {
    if (!parameters || Object.keys(parameters).length === 0) return [];
    const parts = Object.entries(parameters)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${value}`);
    if (parts.length === 0) return [];
    return [`a=fmtp:${payloadType} ${parts.join(';')}`];
  }

  private async allocateRtpPorts(): Promise<{ rtp: number; rtcp: number }> {
    const rtp = await this.allocateUdpPort();
    const rtcp = await this.allocateUdpPort();
    return { rtp, rtcp };
  }

  private async allocateUdpPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const socket = createSocket('udp4');
      socket.once('error', (err) => {
        socket.close();
        reject(err);
      });
      socket.bind(0, '127.0.0.1', () => {
        const address = socket.address();
        const port = typeof address === 'string' ? 0 : address.port;
        socket.close(() => resolve(port));
      });
    });
  }
}
