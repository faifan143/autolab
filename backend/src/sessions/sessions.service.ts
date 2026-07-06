import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { LabDocument } from '../labs/schemas/lab.schema';
import { UserRole } from '../users/schemas/user.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session, SessionDocument } from './schemas/session.schema';

export interface SessionResponse {
  id: string;
  labId: string;
  startTime: string;
  endTime: string;
  lateThresholdMinutes: number;
  qrStartToken: string;
  qrEndToken: string;
  qrStartExpiresAt?: string;
  qrEndExpiresAt?: string;
  isStreaming: boolean;
  streamUrl?: string;
  streamKey?: string;
  streamStartedAt?: string;
  streamEndedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly labsService: LabsService,
  ) {}

  async createSession(
    dto: CreateSessionDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionDocument> {
    const lab = await this.getLabOrThrow(dto.labId);

    if (!this.canMutateLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException(
        'Unauthorized to create session for this lab',
      );
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end <= start) {
      throw new ForbiddenException('Session end time must be after start time');
    }

    const session = new this.sessionModel({
      labId: new Types.ObjectId(dto.labId),
      startTime: start,
      endTime: end,
      lateThresholdMinutes: dto.lateThresholdMinutes ?? 15,
      qrStartToken: new Types.ObjectId().toHexString(),
      qrEndToken: new Types.ObjectId().toHexString(),
      qrStartExpiresAt: end,
      qrEndExpiresAt: end,
    });

    return session.save();
  }

  async findById(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findById(sessionId).exec();
  }

  async findOne(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionResponse> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const lab = await this.getLabOrThrow(session.labId.toString());
    if (!this.canViewLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to view this session');
    }

    return this.formatSessionResponse(session);
  }

  private formatSessionResponse(session: SessionDocument): SessionResponse {
    const timestampedSession = session as SessionDocument & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    };

    return {
      id: timestampedSession._id.toHexString(),
      labId: timestampedSession.labId.toString(),
      startTime: timestampedSession.startTime.toISOString(),
      endTime: timestampedSession.endTime.toISOString(),
      lateThresholdMinutes: timestampedSession.lateThresholdMinutes ?? 15,
      qrStartToken: timestampedSession.qrStartToken,
      qrEndToken: timestampedSession.qrEndToken,
      qrStartExpiresAt: timestampedSession.qrStartExpiresAt?.toISOString(),
      qrEndExpiresAt: timestampedSession.qrEndExpiresAt?.toISOString(),
      isStreaming: timestampedSession.isStreaming ?? false,
      streamUrl: timestampedSession.streamUrl,
      streamKey: timestampedSession.streamKey,
      streamStartedAt: timestampedSession.streamStartedAt?.toISOString(),
      streamEndedAt: timestampedSession.streamEndedAt?.toISOString(),
      createdAt: timestampedSession.createdAt?.toISOString(),
      updatedAt: timestampedSession.updatedAt?.toISOString(),
    };
  }

  private canViewLab(
    lab: LabDocument,
    requesterId: string,
    role: UserRole,
  ): boolean {
    if (role === UserRole.Admin) {
      return true;
    }
    if (role === UserRole.Teacher) {
      return lab.teacherId.toString() === requesterId;
    }
    if (role === UserRole.Student) {
      const studentIds = lab.students ?? [];
      return studentIds.some((id) => id.toString() === requesterId);
    }
    return false;
  }

  async ensureSessionAccess(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const lab = await this.getLabOrThrow(session.labId.toString());
    if (!this.canMutateLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to manage this session');
    }

    return session;
  }

  async rotateQrTokens(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
    expiresInMinutes = 5,
  ): Promise<{ startToken: string; endToken: string; expiresAt: Date }> {
    const session = await this.ensureSessionAccess(
      sessionId,
      requesterId,
      requesterRole,
    );

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    session.qrStartToken = new Types.ObjectId().toHexString();
    session.qrEndToken = new Types.ObjectId().toHexString();
    session.qrStartExpiresAt = expiresAt;
    session.qrEndExpiresAt = expiresAt;
    await session.save();

    return {
      startToken: session.qrStartToken,
      endToken: session.qrEndToken,
      expiresAt,
    };
  }

  private async getLabOrThrow(labId: string): Promise<LabDocument> {
    const lab = await this.labsService.findById(labId);
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }
    return lab;
  }

  private canMutateLab(
    lab: LabDocument,
    requesterId: string,
    role: UserRole,
  ): boolean {
    if (role === UserRole.Admin) {
      return true;
    }
    if (role === UserRole.Teacher) {
      return lab.teacherId.toString() === requesterId;
    }
    return false;
  }

  async startStream(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
    streamUrl?: string,
    streamKey?: string,
  ): Promise<SessionDocument> {
    const session = await this.ensureSessionAccess(
      sessionId,
      requesterId,
      requesterRole,
    );

    if (session.isStreaming) {
      throw new BadRequestException('Stream is already active for this session');
    }

    session.isStreaming = true;
    session.streamUrl = streamUrl;
    session.streamKey = streamKey;
    session.streamStartedAt = new Date();

    return session.save();
  }

  async stopStream(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionDocument> {
    const session = await this.ensureSessionAccess(
      sessionId,
      requesterId,
      requesterRole,
    );

    if (!session.isStreaming) {
      throw new BadRequestException('No active stream for this session');
    }

    session.isStreaming = false;
    session.streamEndedAt = new Date();

    return session.save();
  }
}
