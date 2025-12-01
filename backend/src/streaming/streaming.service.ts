import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LabDocument } from '../labs/schemas/lab.schema';
import { Lab } from '../labs/schemas/lab.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';
import { SessionsService } from '../sessions/sessions.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class StreamingService {
  private activeStreams = new Map<
    string,
    { publisherId: string; startedAt: Date }
  >();

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
    private readonly sessionsService: SessionsService,
  ) {}

  async canJoinStream(
    sessionId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<boolean> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      return false;
    }

    const lab = await this.labModel.findById(session.labId).exec();
    if (!lab) {
      return false;
    }

    // Admin can always join
    if (userRole === UserRole.Admin) {
      return true;
    }

    // Teacher (lab owner) can join
    if (userRole === UserRole.Teacher && lab.teacherId.toString() === userId) {
      return true;
    }

    // Student can join if enrolled in lab
    if (
      userRole === UserRole.Student &&
      lab.students.some((id) => id.toString() === userId)
    ) {
      return true;
    }

    return false;
  }

  async canPublishStream(
    sessionId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<boolean> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      return false;
    }

    const lab = await this.labModel.findById(session.labId).exec();
    if (!lab) {
      return false;
    }

    // Only teacher (lab owner) or admin can publish
    if (userRole === UserRole.Admin) {
      return true;
    }

    if (userRole === UserRole.Teacher && lab.teacherId.toString() === userId) {
      return true;
    }

    return false;
  }

  async isStreamActive(sessionId: string): Promise<boolean> {
    const session = await this.sessionModel.findById(sessionId).exec();
    return session?.isStreaming ?? false;
  }

  async setStreamPublisher(sessionId: string, publisherId: string) {
    this.activeStreams.set(sessionId, {
      publisherId,
      startedAt: new Date(),
    });

    // Update session state
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      isStreaming: true,
      streamStartedAt: new Date(),
    });
  }

  async stopStream(sessionId: string, userId: string): Promise<void> {
    const stream = this.activeStreams.get(sessionId);
    if (!stream || stream.publisherId !== userId) {
      throw new NotFoundException('Stream not found or unauthorized');
    }

    this.activeStreams.delete(sessionId);

    // Update session state
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      isStreaming: false,
      streamEndedAt: new Date(),
    });
  }

  async handleStreamDisconnect(
    sessionId: string,
    userId: string,
    isPublisher: boolean,
  ): Promise<void> {
    if (isPublisher) {
      await this.stopStream(sessionId, userId);
    }
  }

  async notifyStreamStarted(sessionId: string): Promise<void> {
    // This would typically send FCM notifications to students
    // For now, we rely on WebSocket events from the gateway
    // No additional action needed - WebSocket gateway already notifies students
  }

  getActiveStream(sessionId: string) {
    return this.activeStreams.get(sessionId);
  }

  getAllActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }
}

