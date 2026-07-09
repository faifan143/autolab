import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { StoredFile, FileSchema } from '../files/schemas/file.schema';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Lab.name, schema: LabSchema },
      { name: User.name, schema: UserSchema },
      { name: StoredFile.name, schema: FileSchema },
    ]),
    AttendanceModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}






