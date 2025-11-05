import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { ChatMessageResponse } from './interfaces/chat-message-response.interface';

const DEFAULT_LIMIT = 50;

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatModel: Model<ChatMessageDocument>,
    private readonly labsService: LabsService,
    private readonly usersService: UsersService,
  ) {}

  async sendMessage(
    dto: SendMessageDto,
    senderId: string | undefined,
    role: UserRole,
  ): Promise<ChatMessageResponse> {
    if (!senderId) {
      throw new ForbiddenException('Unauthenticated');
    }

    const resolvedSenderId = senderId as string;

    await this.validateSenderRole(resolvedSenderId, role, dto.labId);

    const message = await this.chatModel.create({
      senderId: new Types.ObjectId(resolvedSenderId),
      recipientIds: dto.recipientIds?.map((id) => new Types.ObjectId(id)) ?? [],
      channel: dto.channel,
      content: dto.content,
      labId: dto.labId ? new Types.ObjectId(dto.labId) : undefined,
      readBy: new Map([[resolvedSenderId, true]]),
    });

    return this.toResponse(message);
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.chatModel.updateOne(
      { _id: new Types.ObjectId(messageId) },
      { $set: { [`readBy.${userId}`]: true } },
    );
  }

  async getMessages(
    channel: string,
    requesterId: string,
    role: UserRole,
    limit = DEFAULT_LIMIT,
    afterId?: string,
  ): Promise<ChatMessageResponse[]> {
    await this.ensureAccessToChannel(channel, requesterId, role);

    const criteria: Record<string, unknown> = { channel };
    if (afterId) {
      criteria._id = { $gt: new Types.ObjectId(afterId) };
    }

    const messages = await this.chatModel
      .find(criteria)
      .sort({ createdAt: 1 })
      .limit(Math.min(limit, DEFAULT_LIMIT))
      .exec();

    return messages.map((message) => this.toResponse(message));
  }

  private async validateSenderRole(
    senderId: string,
    role: UserRole,
    labId?: string,
  ): Promise<void> {
    const sender = await this.usersService.findById(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    if (role === UserRole.Student) {
      throw new ForbiddenException('Students cannot send messages in teacher chat');
    }

    if (labId) {
      const lab = await this.labsService.findById(labId);
      if (!lab) {
        throw new NotFoundException('Lab not found');
      }

      const isLabTeacher = lab.teacherId.toString() === senderId;
      const isLabStudent = lab.students.some((id) => id.toString() === senderId);

      if (!isLabTeacher && role !== UserRole.Admin && !isLabStudent) {
        throw new ForbiddenException('Not allowed to post in this lab channel');
      }
    }
  }

  async ensureAccessToChannel(
    channel: string,
    requesterId: string | undefined,
    role: UserRole,
  ): Promise<void> {
    if (!requesterId) {
      throw new ForbiddenException('Unauthenticated');
    }
    if (channel.startsWith('lab:')) {
      const labId = channel.split(':')[1];
      const lab = await this.labsService.findById(labId);
      if (!lab) {
        throw new NotFoundException('Lab not found');
      }

      if (role === UserRole.Admin) {
        return;
      }

      const isTeacher = lab.teacherId.toString() === requesterId;
      const isMember = lab.students.some((id) => id.toString() === requesterId);

      if (!isTeacher && !isMember) {
        throw new ForbiddenException('Unauthorized for this lab channel');
      }
    }

    if (channel.startsWith('department:') && role === UserRole.Student) {
      throw new ForbiddenException('Students cannot access department channels');
    }
  }

  private toResponse(message: ChatMessageDocument): ChatMessageResponse {
    const plain = message.toObject();
    return {
      id: message.id,
      channel: plain.channel,
      content: plain.content,
      senderId: plain.senderId?.toString?.() ?? String(plain.senderId),
      recipientIds: (plain.recipientIds ?? []).map((id: any) =>
        id?.toString?.() ?? String(id),
      ),
      labId: plain.labId ? plain.labId.toString() : undefined,
      createdAt:
        plain.createdAt instanceof Date
          ? plain.createdAt.toISOString()
          : plain.createdAt ?? new Date().toISOString(),
    };
  }
}
