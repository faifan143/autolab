import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabStudentsDto } from './dto/update-lab-students.dto';
import { LabsService } from './labs.service';
import {
  UpdateLabArchiveDto,
  UpdateLabSuspensionDto,
} from './dto/update-lab-flags.dto';
import { ArchiveRequestDto } from './dto/archive-request.dto';
import { ApproveArchiveRequestDto } from './dto/approve-archive-request.dto';

@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  createLab(@Body() dto: CreateLabDto, @Request() req: AuthenticatedRequest) {
    return this.labsService.createLab(dto, req.user.userId, req.user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  findAll(@Request() req: AuthenticatedRequest) {
    return this.labsService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  findOne(@Param('id') labId: string, @Request() req: AuthenticatedRequest) {
    return this.labsService.findOne(labId, req.user.userId, req.user.role);
  }

  @Get(':labId/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  findLabSessions(
    @Param('labId') labId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.labsService.findLabSessions(
      labId,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  assignStudents(
    @Param('id') labId: string,
    @Body() dto: UpdateLabStudentsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.labsService.assignStudents(
      labId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  archiveLab(
    @Param('id') labId: string,
    @Body() dto: UpdateLabArchiveDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.labsService.updateArchiveStatus(
      labId,
      dto.isArchived,
      req.user.role,
    );
  }

  @Patch(':id/suspension')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  suspendLab(
    @Param('id') labId: string,
    @Body() dto: UpdateLabSuspensionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.labsService.updateSuspension(
      labId,
      dto.isSuspended,
      dto.suspendReason,
      req.user.role,
    );
  }

  @Post(':id/archive-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher)
  requestArchive(
    @Param('id') labId: string,
    @Body() dto: ArchiveRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.labsService.requestArchive(
      labId,
      req.user.userId,
      req.user.role,
      dto.reason,
    );
  }

  @Patch(':id/archive-request/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  approveArchiveRequest(
    @Param('id') labId: string,
    @Body() dto: ApproveArchiveRequestDto,
  ) {
    return this.labsService.approveArchiveRequest(
      labId,
      dto.approved,
      dto.adminNote,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async deleteLab(
    @Param('id') labId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.labsService.deleteLab(labId, req.user.userId, req.user.role);
    return { deleted: true };
  }
}
