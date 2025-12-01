import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { AdminService } from './admin.service';
import { ReportRangeDto } from './dto/report-range.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('reports/attendance')
  getAttendanceReport(@Query() query: ReportRangeDto) {
    return this.adminService.getAttendanceReport(query);
  }

  @Get('reports/grades')
  getGradeReport(@Query() query: ReportRangeDto) {
    return this.adminService.getGradeReport(query);
  }

  @Get('archive/labs')
  getArchivedLabs() {
    return this.adminService.listArchivedLabs();
  }
}
