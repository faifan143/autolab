import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService } from './files.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin, UserRole.Student)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.filesService.upload(dto, file, req.user.userId, req.user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin, UserRole.Student)
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('labId') labId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.filesService.findAll(
      req.user.userId,
      req.user.role,
      labId,
      sessionId,
      ownerId,
    );
  }

  @Get(':id/url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin, UserRole.Student)
  getDownloadUrl(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.filesService.getDownloadUrl(id, req.user.userId, req.user.role);
  }
}
