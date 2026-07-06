import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabStudentsDto } from './dto/update-lab-students.dto';
import { Lab, LabDocument } from './schemas/lab.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';
import type { SessionResponse } from '../sessions/sessions.service';

export interface LabResponse {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  isArchived: boolean;
  archivedAt?: string;
  isSuspended: boolean;
  suspendedAt?: string;
  suspendReason?: string;
  archiveRequested: boolean;
  archiveRequestedAt?: string;
  archiveRequestReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class LabsService {
  constructor(
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createLab(
    dto: CreateLabDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LabDocument> {
    const teacherId = dto.teacherId ?? requesterId;

    if (requesterRole === UserRole.Teacher && teacherId !== requesterId) {
      throw new ForbiddenException(
        'Teachers can only create labs for themselves',
      );
    }

    if (requesterRole === UserRole.Student) {
      throw new ForbiddenException('Students cannot create labs');
    }

    await this.ensureUserExists(teacherId, UserRole.Teacher);

    const studentObjectIds = await this.normalizeStudentIds(
      dto.studentIds ?? [],
    );

    const lab = new this.labModel({
      name: dto.name,
      teacherId: new Types.ObjectId(teacherId),
      students: studentObjectIds,
    });

    return lab.save();
  }

  async assignStudents(
    labId: string,
    dto: UpdateLabStudentsDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LabDocument> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId);
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!this.canMutateLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to update this lab');
    }

    const studentObjectIds = await this.normalizeStudentIds(dto.studentIds);
    lab.students = studentObjectIds;
    return lab.save();
  }

  async updateArchiveStatus(
    labId: string,
    isArchived: boolean,
    requesterRole: UserRole,
  ): Promise<LabDocument> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (requesterRole !== UserRole.Admin) {
      throw new ForbiddenException('Only administrators can archive labs');
    }

    lab.isArchived = isArchived;
    lab.archivedAt = isArchived ? new Date() : undefined;
    return lab.save();
  }

  async updateSuspension(
    labId: string,
    isSuspended: boolean,
    suspendReason: string | undefined,
    requesterRole: UserRole,
  ): Promise<LabDocument> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (requesterRole !== UserRole.Admin) {
      throw new ForbiddenException('Only administrators can suspend labs');
    }

    lab.isSuspended = isSuspended;
    if (isSuspended) {
      lab.suspendedAt = new Date();
      lab.suspendReason = suspendReason?.trim();
    } else {
      lab.suspendedAt = undefined;
      lab.suspendReason = undefined;
    }

    return lab.save();
  }

  async requestArchive(
    labId: string,
    requesterId: string,
    requesterRole: UserRole,
    reason?: string,
  ): Promise<LabDocument> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    // Only teachers can request archive (admins can directly archive)
    if (requesterRole !== UserRole.Teacher) {
      throw new ForbiddenException('Only teachers can request archiving');
    }

    if (lab.teacherId.toString() !== requesterId) {
      throw new ForbiddenException('Only the lab owner can request archiving');
    }

    if (lab.isArchived) {
      throw new BadRequestException('Lab is already archived');
    }

    if (lab.archiveRequested) {
      throw new BadRequestException('Archive request already pending');
    }

    lab.archiveRequested = true;
    lab.archiveRequestedAt = new Date();
    lab.archiveRequestReason = reason?.trim();

    return lab.save();
  }

  async approveArchiveRequest(
    labId: string,
    approved: boolean,
    adminNote?: string,
  ): Promise<LabDocument> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!lab.archiveRequested) {
      throw new BadRequestException('No archive request pending for this lab');
    }

    if (approved) {
      lab.isArchived = true;
      lab.archivedAt = new Date();
      lab.archiveRequested = false;
      lab.archiveRequestedAt = undefined;
      lab.archiveRequestReason = undefined;
    } else {
      // Reject the request - clear the request flags
      lab.archiveRequested = false;
      lab.archiveRequestedAt = undefined;
      if (adminNote) {
        lab.archiveRequestReason = adminNote.trim();
      } else {
        lab.archiveRequestReason = undefined;
      }
    }

    return lab.save();
  }

  async deleteLab(
    labId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!this.canMutateLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to delete this lab');
    }

    await this.sessionModel
      .deleteMany({ labId: new Types.ObjectId(labId) })
      .exec();
    await lab.deleteOne();
  }

  async findById(labId: string): Promise<LabDocument | null> {
    this.ensureValidId(labId, 'labId');
    return this.labModel.findById(labId).exec();
  }

  async findAll(
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LabResponse[]> {
    let labs: LabDocument[];

    if (requesterRole === UserRole.Admin) {
      labs = await this.labModel.find().exec();
    } else if (requesterRole === UserRole.Teacher) {
      labs = await this.labModel
        .find({ teacherId: new Types.ObjectId(requesterId) })
        .exec();
    } else if (requesterRole === UserRole.Student) {
      labs = await this.labModel
        .find({ students: new Types.ObjectId(requesterId) })
        .exec();
    } else {
      return [];
    }

    return labs.map((lab) => this.formatLabResponse(lab));
  }

  async findOne(
    labId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LabResponse> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!this.canViewLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException('Unauthorized to view this lab');
    }

    return this.formatLabResponse(lab);
  }

  async findLabSessions(
    labId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<SessionResponse[]> {
    this.ensureValidId(labId, 'labId');
    const lab = await this.labModel.findById(labId).exec();
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!this.canViewLab(lab, requesterId, requesterRole)) {
      throw new ForbiddenException(
        'Unauthorized to view sessions for this lab',
      );
    }

    const sessions = await this.sessionModel
      .find({ labId: new Types.ObjectId(labId) })
      .exec();
    return sessions.map((session) => this.formatSessionResponse(session));
  }

  private formatLabResponse(lab: LabDocument): LabResponse {
    const timestampedLab = lab as LabDocument & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
      students?: Types.ObjectId[];
    };

    return {
      id: timestampedLab._id.toHexString(),
      name: timestampedLab.name,
      teacherId: timestampedLab.teacherId.toString(),
      studentIds: (timestampedLab.students ?? []).map((id) => id.toString()),
      isArchived: timestampedLab.isArchived ?? false,
      archivedAt: timestampedLab.archivedAt?.toISOString(),
      isSuspended: timestampedLab.isSuspended ?? false,
      suspendedAt: timestampedLab.suspendedAt?.toISOString(),
      suspendReason: timestampedLab.suspendReason ?? undefined,
      archiveRequested: timestampedLab.archiveRequested ?? false,
      archiveRequestedAt: timestampedLab.archiveRequestedAt?.toISOString(),
      archiveRequestReason: timestampedLab.archiveRequestReason ?? undefined,
      createdAt: timestampedLab.createdAt?.toISOString(),
      updatedAt: timestampedLab.updatedAt?.toISOString(),
    };
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

  private async normalizeStudentIds(
    studentIds: string[],
  ): Promise<Types.ObjectId[]> {
    if (!studentIds || studentIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(studentIds)];
    const validStudents = await Promise.all(
      uniqueIds.map(async (studentId) => {
        const user = await this.usersService.findById(studentId);
        if (!user) {
          throw new NotFoundException(`Student ${studentId} not found`);
        }
        if (user.role !== UserRole.Student) {
          throw new ForbiddenException(
            'Only student accounts can be assigned to labs',
          );
        }
        return new Types.ObjectId(studentId);
      }),
    );

    return validStudents;
  }

  private async ensureUserExists(
    userId: string,
    role: UserRole,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== role) {
      throw new NotFoundException(`${role} user not found`);
    }
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

  private ensureValidId(id: string, field: string) {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} must be a valid ObjectId`);
    }
  }
}
