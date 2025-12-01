import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Roles(UserRole.Student)
  createComplaint(
    @Body() dto: CreateComplaintDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.complaintsService.createComplaint(dto, req.user.userId);
  }

  @Get('me')
  @Roles(UserRole.Student)
  getMyComplaints(@Request() req: AuthenticatedRequest) {
    return this.complaintsService.findStudentComplaints(req.user.userId);
  }

  @Get()
  @Roles(UserRole.Admin)
  getComplaints(@Query() query: QueryComplaintsDto) {
    return this.complaintsService.findAdminComplaints(query);
  }

  @Get(':id')
  @Roles(UserRole.Admin)
  getComplaint(@Param('id') id: string) {
    return this.complaintsService.findAdminComplaint(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin)
  updateComplaintStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.complaintsService.updateStatus(id, req.user.userId, dto);
  }
}






