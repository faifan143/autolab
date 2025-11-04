import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { AttendanceService } from './attendance.service';
import { GenerateAttendanceQrDto } from './dto/generate-attendance-qr.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post(':sessionId/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  generateQr(
    @Param('sessionId') sessionId: string,
    @Body() dto: GenerateAttendanceQrDto,
    @Request() req: any,
  ) {
    return this.attendanceService.generateSessionQr(sessionId, dto, req.user.userId, req.user.role);
  }

  @Post(':sessionId/scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student)
  submitAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAttendanceDto,
    @Request() req: any,
  ) {
    return this.attendanceService.submitAttendance(sessionId, req.user.userId, dto);
  }
}
