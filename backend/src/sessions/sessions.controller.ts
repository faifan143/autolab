import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { diskStorage } from 'multer';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { FilesService } from '../files/files.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { StartStreamDto } from './dto/start-stream.dto';
import { SessionsService } from './sessions.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ServerRecordingService } from '../streaming/server-recording.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly filesService: FilesService,
    private readonly serverRecordingService: ServerRecordingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  createSession(
    @Body() dto: CreateSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.createSession(
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  findOne(
    @Param('id') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findOne(
      sessionId,
      req.user.userId,
      req.user.role,
    );
  }

  @Post(':id/stream-video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @UseInterceptors(
    FileInterceptor('video', {
      // Use disk storage to avoid buffering large videos in memory.
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const extIndex = file.originalname.lastIndexOf('.');
          const ext = extIndex !== -1 ? file.originalname.slice(extIndex) : '';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for videos
      },
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'application/x-mpegURL' ||
          file.mimetype === 'application/vnd.apple.mpegurl'
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only video files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async uploadStreamVideo(
    @Param('id') sessionId: string,
    @UploadedFile() video: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!video) {
      throw new BadRequestException('Video file is required');
    }

    // Ensure teacher has access to this session
    await this.sessionsService.ensureSessionAccess(
      sessionId,
      req.user.userId,
      req.user.role,
    );

    // Get session to find labId
    const session = await this.sessionsService.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Upload video to session assets using FilesService
    return this.filesService.upload(
      {
        sessionId,
        labId: session.labId.toString(),
      },
      video,
      req.user.userId,
      req.user.role,
    );
  }

  @Post(':id/stream/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  async startStream(
    @Param('id') sessionId: string,
    @Body() dto: StartStreamDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.startStream(
      sessionId,
      req.user.userId,
      req.user.role,
      dto.streamUrl,
      dto.streamKey,
    );
  }

  @Post(':id/stream/stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  async stopStream(
    @Param('id') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const stopped = await this.sessionsService.stopStream(
      sessionId,
      req.user.userId,
      req.user.role,
    );

    // Best effort: attach the generated local mp4 recording to session files.
    await this.attachLocalRecordingIfExists(sessionId, req.user.userId, req.user.role);
    return stopped;
  }

  private async attachLocalRecordingIfExists(
    sessionId: string,
    requesterId: string,
    role: UserRole,
  ): Promise<void> {
    const session = await this.sessionsService.findById(sessionId);
    if (!session) return;

    const target = await this.serverRecordingService.findLatestRecordingPath(sessionId);
    if (!target) return;

    const fileStats = await stat(target);
    if (fileStats.size < 1024) {
      return;
    }
    const ext = '.mp4';
    const file = {
      path: target,
      originalname: `session_stream_${sessionId}${ext}`,
      mimetype: 'video/mp4',
      size: fileStats.size,
    } as Express.Multer.File;

    await this.filesService.upload(
      {
        sessionId,
        labId: session.labId.toString(),
      },
      file,
      requesterId,
      role,
    );
  }
}
