import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({ namespace: '/ws/teachers', cors: true })
@UseGuards(WsJwtGuard, RolesGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    // Authentication handled by WsJwtGuard
  }

  async handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });
  }

  @SubscribeMessage('joinChannel')
  @Roles(UserRole.Teacher, UserRole.Admin)
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody('channel') channel: string,
  ) {
    const user = client.data.user;
    await this.chatService.ensureAccessToChannel(
      channel,
      user?.userId,
      user?.role ?? UserRole.Teacher,
    );
    client.join(channel);
    client.emit('joinedChannel', { channel });
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody('channel') channel: string,
  ) {
    client.leave(channel);
    client.emit('leftChannel', { channel });
  }

  @SubscribeMessage('sendMessage')
  @Roles(UserRole.Teacher, UserRole.Admin)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const user = client.data.user;
    const message = await this.chatService.sendMessage(
      payload,
      user?.userId,
      user?.role ?? UserRole.Teacher,
    );

    this.server.to(payload.channel).emit('message', message);
  }
}

