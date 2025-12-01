import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './schemas/user.schema';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkUpdateUsersDto } from './dto/bulk-update-users.dto';
import { BulkDeleteUsersDto } from './dto/bulk-delete-users.dto';
import { UpdateUserSuspensionDto } from './dto/update-user-suspension.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.usersService.findAll(
      req.user.userId,
      req.user.role,
      role,
      search,
      parsedLimit,
      parsedOffset,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateOne(
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateUser(userId, dto, req.user.role);
  }

  @Patch('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateMany(
    @Body() dto: BulkUpdateUsersDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateUsersBulk(
      dto.userIds,
      dto.update,
      req.user.role,
    );
  }

  @Patch(':id/suspension')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateSuspension(
    @Param('id') userId: string,
    @Body() dto: UpdateUserSuspensionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateUserSuspension(
      userId,
      dto.isSuspended,
      dto.suspendReason,
      req.user.role,
    );
  }

  @Post('bulk/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async deleteMany(
    @Body() dto: BulkDeleteUsersDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const deleted = await this.usersService.deleteUsersBulk(
      dto.userIds,
      req.user.role,
    );
    return { deleted };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  findOne(@Param('id') userId: string, @Request() req: AuthenticatedRequest) {
    return this.usersService.findOne(userId, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOne(@Param('id') userId: string, @Request() req: AuthenticatedRequest) {
    return this.usersService.deleteUser(userId, req.user.role);
  }
}
