import {
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

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly labsService: LabsService,
  ) {}

  async createSession(
    dto: CreateSessionDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionDocument> {
    const lab = await this.getLabOrThrow(dto.labId);

    if (!this.canMutateLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to create session for this lab');
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
      qrStartToken: new Types.ObjectId().toHexString(),
      qrEndToken: new Types.ObjectId().toHexString(),
      recordedVideoUrl: dto.recordedVideoUrl,
      qrStartExpiresAt: end,
      qrEndExpiresAt: end,
    });

    return session.save();
  }

  async findById(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findById(sessionId).exec();
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
    const session = await this.ensureSessionAccess(sessionId, requesterId, requesterRole);

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

  private canMutateLab(lab: LabDocument, requesterId: string, role: UserRole): boolean {
    if (role === UserRole.Admin) {
      return true;
    }
    if (role === UserRole.Teacher) {
      return lab.teacherId.toString() === requesterId;
    }
    return false;
  }
}
