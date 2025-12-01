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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { FilesService } from '../files/files.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { StartStreamDto } from './dto/start-stream.dto';
import { SessionsService } from './sessions.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly filesService: FilesService,
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
      storage: memoryStorage(),
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
  startStream(
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
  stopStream(
    @Param('id') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.stopStream(
      sessionId,
      req.user.userId,
      req.user.role,
    );
  }
}
