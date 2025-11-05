import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LabsModule } from '../labs/labs.module';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ChatMessage.name, schema: ChatMessageSchema }]),
    AuthModule,
    UsersModule,
    LabsModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
