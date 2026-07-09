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
import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';
import { AttendanceGateway } from '../attendance/attendance.gateway';
import { FileDocument, StoredFile } from '../files/schemas/file.schema';

interface ChatSenderResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ChatMessageResponse {
  id: string;
  channel: string;
  labId?: string;
  senderId: string;
  sender?: ChatSenderResponse;
  recipientIds: string[];
  content?: string;
  fileIds: string[];
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    ownerId: string;
    labId?: string;
    sessionId?: string;
    storageKey: string;
    version: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(StoredFile.name)
    private readonly fileModel: Model<FileDocument>,
    private readonly attendanceGateway: AttendanceGateway,
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

    return this.toResponsesWithSenderAndFiles(messages);
  }

  async sendMessage(
    dto: SendMessageDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ChatMessageResponse> {
    const channel = dto.channel.trim();
    const { labId } = this.extractChannelMetadata(channel, dto.labId);

    await this.assertChannelAccess(channel, labId, requesterId, requesterRole);

    const trimmedContent = dto.content?.trim();
    const requestedFileIds = dto.fileIds ?? [];
    if ((!trimmedContent || trimmedContent.length === 0) && requestedFileIds.length === 0) {
      throw new ForbiddenException('Message must include content or at least one file');
    }

    const validFileIds = await this.resolveAndValidateFiles(
      requestedFileIds,
      requesterId,
      requesterRole,
      labId,
    );

    const message = new this.messageModel({
      channel,
      labId: labId ? new Types.ObjectId(labId) : undefined,
      senderId: new Types.ObjectId(requesterId),
      recipientIds: (dto.recipientIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      content: trimmedContent,
      fileIds: validFileIds.map((id) => new Types.ObjectId(id)),
    });

    await message.save();

    const [response] = await this.toResponsesWithSenderAndFiles([message]);

    // Emit real-time event for newly created chat message.
    this.attendanceGateway.emitChatMessageCreated(response);

    return response;
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
      fileIds: [],
      files: [],
      createdAt: withTimestamps.createdAt.toISOString(),
    };
  }

  private async toResponsesWithSenderAndFiles(
    messages: ChatMessageDocument[],
  ): Promise<ChatMessageResponse[]> {
    if (messages.length === 0) return [];

    const baseResponses = messages.map((message) => this.toResponse(message));
    const senderIds = Array.from(
      new Set(baseResponses.map((m) => m.senderId).filter(Boolean)),
    );
    const messageFileIdsMap = new Map<string, string[]>();
    const allFileIds = new Set<string>();
    for (const message of messages) {
      const messageId = (message as ChatMessageDocument & { id: string }).id;
      const fileIds = ((message as any).fileIds ?? [])
        .map((id: Types.ObjectId | string) => this.toHexString(id))
        .filter((id: string | undefined): id is string => Boolean(id));
      messageFileIdsMap.set(messageId, fileIds);
      for (const id of fileIds) allFileIds.add(id);
    }

    const senders = await this.userModel
      .find({ _id: { $in: senderIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id name email role')
      .lean()
      .exec();

    const senderMap = new Map<string, ChatSenderResponse>();
    for (const sender of senders) {
      const id = String(sender._id);
      senderMap.set(id, {
        id,
        name: sender.name,
        email: sender.email,
        role: sender.role,
      });
    }

    const files = allFileIds.size
      ? await this.fileModel
          .find({ _id: { $in: Array.from(allFileIds).map((id) => new Types.ObjectId(id)) } })
          .exec()
      : [];
    const fileMap = new Map<string, ChatMessageResponse['files'][number]>();
    for (const file of files) {
      const f = file as FileDocument & {
        _id: Types.ObjectId;
        createdAt?: Date;
        updatedAt?: Date;
      };
      fileMap.set(f._id.toHexString(), {
        id: f._id.toHexString(),
        fileName: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
        ownerId: f.ownerId.toString(),
        labId: f.labId?.toString(),
        sessionId: f.sessionId?.toString(),
        storageKey: f.storageKey,
        version: f.version,
        createdAt: f.createdAt?.toISOString(),
        updatedAt: f.updatedAt?.toISOString(),
      });
    }

    return baseResponses.map((message) => {
      const ids = messageFileIdsMap.get(message.id) ?? [];
      return {
        ...message,
        sender: senderMap.get(message.senderId),
        fileIds: ids,
        files: ids.map((id) => fileMap.get(id)).filter(Boolean) as ChatMessageResponse['files'],
      };
    });
  }

  private async resolveAndValidateFiles(
    fileIds: string[],
    requesterId: string,
    requesterRole: UserRole,
    labId?: string,
  ): Promise<string[]> {
    if (!fileIds.length) return [];

    const normalized = Array.from(new Set(fileIds));
    normalized.forEach((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new ForbiddenException('Invalid file identifier');
      }
    });

    const files = await this.fileModel
      .find({ _id: { $in: normalized.map((id) => new Types.ObjectId(id)) } })
      .exec();
    if (files.length !== normalized.length) {
      throw new NotFoundException('One or more files were not found');
    }

    for (const file of files) {
      if (requesterRole !== UserRole.Admin && file.ownerId.toString() !== requesterId) {
        throw new ForbiddenException('You can only attach files you uploaded');
      }
      if (labId && file.labId?.toString() !== labId) {
        throw new ForbiddenException('Attached files must belong to the same lab');
      }
    }

    return normalized;
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
