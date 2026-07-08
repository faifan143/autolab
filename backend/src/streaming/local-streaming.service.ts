import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import NodeMediaServer from 'node-media-server';

@Injectable()
export class LocalStreamingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocalStreamingService.name);
  private nms: NodeMediaServer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if ((this.configService.get<string>('STREAMING_EMBEDDED_ENABLED') ?? 'true') !== 'true') {
      this.logger.log('Embedded RTMP/HLS server disabled by env.');
      return;
    }

    const mediaRoot = this.mediaRoot;
    mkdirSync(mediaRoot, { recursive: true });

    this.nms = new NodeMediaServer({
      rtmp: {
        port: this.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: this.httpPort,
        mediaroot: mediaRoot,
        allow_origin: '*',
      },
      trans: {
        ffmpeg: this.ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            hlsKeep: false,
            mp4: true,
            mp4Flags: '[movflags=faststart]',
          },
        ],
      },
    });

    this.nms.run();
    this.logger.log(
      `Embedded RTMP/HLS server started (RTMP:${this.rtmpPort}, HLS:${this.httpPort})`,
    );
  }

  onModuleDestroy(): void {
    this.nms?.stop();
    this.nms = null;
  }

  get streamHost(): string {
    return this.configService.get<string>('STREAM_HOST') ?? '127.0.0.1';
  }

  get rtmpPort(): number {
    return Number(this.configService.get<string>('STREAM_RTMP_PORT') ?? 1935);
  }

  get httpPort(): number {
    return Number(this.configService.get<string>('STREAM_HTTP_PORT') ?? 8000);
  }

  get mediaRoot(): string {
    return this.configService.get<string>('STREAM_MEDIA_ROOT') ?? join(process.cwd(), 'media');
  }

  private get ffmpegPath(): string {
    return this.configService.get<string>('FFMPEG_PATH') ?? 'ffmpeg';
  }

  buildPublishUrl(streamKey: string): string {
    return `rtmp://${this.streamHost}:${this.rtmpPort}/live/${streamKey}`;
  }

  buildHlsUrl(streamKey: string): string {
    return `http://${this.streamHost}:${this.httpPort}/live/${streamKey}/index.m3u8`;
  }
}
