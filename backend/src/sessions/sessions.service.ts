import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { Lab } from '../labs/schemas/lab.schema';
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
  ): Promise<Session> {
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
    });

    return session.save();
  }

  async findById(sessionId: string): Promise<Session | null> {
    return this.sessionModel.findById(sessionId).exec();
  }

  private async getLabOrThrow(labId: string): Promise<Lab> {
    const lab = await this.labsService.findById(labId);
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }
    return lab;
  }

  private canMutateLab(lab: Lab, requesterId: string, role: UserRole): boolean {
    if (role === UserRole.Admin) {
      return true;
    }
    if (role === UserRole.Teacher) {
      return lab.teacherId.toString() === requesterId;
    }
    return false;
  }
}
