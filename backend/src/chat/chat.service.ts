import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UserRole } from '../users/schemas/user.schema';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';

export interface ChatMessageResponse {
  id: string;
  channel: string;
  labId?: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  createdAt: string;
}

const LAB_CHANNEL_PREFIX = 'lab:';
const TEACHERS_LOBBY_CHANNEL = 'teachers:lobby';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @InjectModel(Lab.name)
    private readonly labModel: Model<LabDocument>,
  ) {}

  async getMessages(
    query: QueryMessagesDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ChatMessageResponse[]> {
    const channel = query.channel.trim();
    const { labId } = this.extractChannelMetadata(channel, query.labId);

    await this.assertChannelAccess(channel, labId, requesterId, requesterRole);

    const filters: FilterQuery<ChatMessageDocument> = { channel };
    if (labId) {
      filters.labId = new Types.ObjectId(labId);
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const messages = await this.messageModel
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return messages.map((message) => this.toResponse(message));
  }

  async sendMessage(
    dto: SendMessageDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ChatMessageResponse> {
    const channel = dto.channel.trim();
    const { labId } = this.extractChannelMetadata(channel, dto.labId);

    await this.assertChannelAccess(channel, labId, requesterId, requesterRole);

    const message = new this.messageModel({
      channel,
      labId: labId ? new Types.ObjectId(labId) : undefined,
      senderId: new Types.ObjectId(requesterId),
      recipientIds: (dto.recipientIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      content: dto.content.trim(),
    });

    await message.save();

    return this.toResponse(message);
  }

  private toResponse(message: ChatMessageDocument): ChatMessageResponse {
    const withTimestamps = message as ChatMessageDocument & {
      createdAt: Date;
      id: string;
    };
    const labId = this.toHexString(withTimestamps.labId);
    const senderId = this.toHexString(withTimestamps.senderId) ?? '';

    return {
      id: withTimestamps.id,
      channel: withTimestamps.channel,
      labId,
      senderId,
      recipientIds: (withTimestamps.recipientIds ?? []).map(
        (id) => this.toHexString(id) ?? '',
      ),
      content: withTimestamps.content,
      createdAt: withTimestamps.createdAt.toISOString(),
    };
  }

  private extractChannelMetadata(channel: string, suppliedLabId?: string) {
    if (channel.startsWith(LAB_CHANNEL_PREFIX)) {
      const resolvedLabId = channel.slice(LAB_CHANNEL_PREFIX.length);
      if (!resolvedLabId) {
        throw new ForbiddenException('Invalid lab channel');
      }
      if (suppliedLabId && suppliedLabId !== resolvedLabId) {
        throw new ForbiddenException('Channel does not match lab identifier');
      }
      return { labId: resolvedLabId };
    }

    if (channel === TEACHERS_LOBBY_CHANNEL) {
      return { labId: undefined };
    }

    throw new ForbiddenException('Unsupported chat channel');
  }

  private async assertChannelAccess(
    channel: string,
    labId: string | undefined,
    requesterId: string,
    role: UserRole,
  ) {
    if (channel === TEACHERS_LOBBY_CHANNEL) {
      if (role === UserRole.Admin || role === UserRole.Teacher) {
        return;
      }
      throw new ForbiddenException(
        'Only teachers and admins can access this channel',
      );
    }

    if (!labId) {
      throw new ForbiddenException('Lab channel requires lab identifier');
    }

    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (role === UserRole.Admin) {
      return;
    }

    if (role === UserRole.Teacher) {
      if (lab.teacherId.toString() !== requesterId) {
        throw new ForbiddenException('Teachers can only access their labs');
      }
      return;
    }

    if (role === UserRole.Student) {
      const isEnrolled = (lab.students ?? []).some(
        (studentId) => studentId.toString() === requesterId,
      );
      if (!isEnrolled) {
        throw new ForbiddenException('Students must be enrolled in the lab');
      }
      return;
    }

    throw new ForbiddenException('Unauthorized');
  }

  private toHexString(
    value: Types.ObjectId | string | undefined | null,
  ): string | undefined {
    if (!value) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }
    return undefined;
  }
}
