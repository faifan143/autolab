import {
  Body,
  Controller,
  Get,
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
import { ChatService } from './chat.service';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  getMessages(
    @Query() query: QueryMessagesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getMessages(query, req.user.userId, req.user.role);
  }

  @Post('messages')
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.sendMessage(dto, req.user.userId, req.user.role);
  }
}






