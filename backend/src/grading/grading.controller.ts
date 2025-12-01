import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { CreateGradeDto } from './dto/create-grade.dto';
import { QueryGradesDto } from './dto/query-grades.dto';
import { GradingService } from './grading.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('grades')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  createGrade(
    @Body() dto: CreateGradeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gradingService.createGrade(dto, req.user.userId, req.user.role);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  getMyGrades(
    @Query() query: QueryGradesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gradingService.getGradesForUser(
      req.user.userId,
      req.user.userId,
      req.user.role,
      query.labId,
    );
  }

  @Get('students/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  getGradesForStudent(
    @Param('studentId') studentId: string,
    @Query() query: QueryGradesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gradingService.getGradesForUser(
      studentId,
      req.user.userId,
      req.user.role,
      query.labId,
    );
  }

  @Get('labs/:labId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin, UserRole.Student)
  getGradesForLab(
    @Param('labId') labId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.gradingService.getGradesForLab(
      labId,
      req.user.userId,
      req.user.role,
    );
  }
}
