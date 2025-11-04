import { Body, Controller, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabStudentsDto } from './dto/update-lab-students.dto';
import { LabsService } from './labs.service';

@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  createLab(@Body() dto: CreateLabDto, @Request() req: any) {
    return this.labsService.createLab(dto, req.user.userId, req.user.role);
  }

  @Patch(':id/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  assignStudents(
    @Param('id') labId: string,
    @Body() dto: UpdateLabStudentsDto,
    @Request() req: any,
  ) {
    return this.labsService.assignStudents(labId, dto, req.user.userId, req.user.role);
  }
}
