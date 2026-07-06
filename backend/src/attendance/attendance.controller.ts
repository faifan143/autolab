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
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { GenerateAttendanceQrDto } from './dto/generate-attendance-qr.dto';
import { ScanStudentAttendanceDto } from './dto/scan-student-attendance.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('sessions/:sessionId/my-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student)
  getStudentCheckInQr(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attendanceService.generateStudentCheckInQr(
      sessionId,
      req.user.userId,
      req.user.role,
    );
  }

  @Post('sessions/:sessionId/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  scanStudentQr(
    @Param('sessionId') sessionId: string,
    @Body() dto: ScanStudentAttendanceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attendanceService.scanStudentAttendance(
      sessionId,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Post(':sessionId/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  generateQr(
    @Param('sessionId') sessionId: string,
    @Body() dto: GenerateAttendanceQrDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attendanceService.generateSessionQr(
      sessionId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Post(':sessionId/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student)
  submitAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAttendanceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attendanceService.submitAttendance(
      sessionId,
      req.user.userId,
      dto,
    );
  }

  @Get('sessions/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  getSessionAttendance(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.attendanceService.getSessionAttendance(
      sessionId,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  getMyAttendance(
    @Request() req: AuthenticatedRequest,
    @Query('labId') labId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.attendanceService.getStudentAttendance(
      req.user.userId,
      req.user.userId,
      req.user.role,
      labId,
      sessionId,
    );
  }

  @Get('students/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @Request() req: AuthenticatedRequest,
    @Query('labId') labId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.attendanceService.getStudentAttendance(
      studentId,
      req.user.userId,
      req.user.role,
      labId,
      sessionId,
    );
  }
}
