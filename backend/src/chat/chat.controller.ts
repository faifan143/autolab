import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ChatService } from './chat.service';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @Roles(UserRole.Teacher, UserRole.Admin)
  sendMessage(@Body() dto: SendMessageDto, @Request() req: any) {
    return this.chatService.sendMessage(dto, req.user.userId, req.user.role);
  }

  @Get('messages')
  @Roles(UserRole.Teacher, UserRole.Admin)
  getMessages(@Query() query: QueryMessagesDto, @Request() req: any) {
    return this.chatService.getMessages(
      query.channel,
      req.user.userId,
      req.user.role,
      query.limit,
      query.afterId,
    );
  }
}
