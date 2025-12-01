import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { LabDocument } from '../labs/schemas/lab.schema';
import { SessionsService } from '../sessions/sessions.service';
import { SessionDocument } from '../sessions/schemas/session.schema';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { GenerateAttendanceQrDto } from './dto/generate-attendance-qr.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { AttendanceGateway } from './attendance.gateway';
import {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
} from './schemas/attendance.schema';

export interface AttendanceResponse {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_QR_EXPIRATION_MINUTES = 5;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    private readonly sessionsService: SessionsService,
    private readonly labsService: LabsService,
    private readonly usersService: UsersService,
    private readonly attendanceGateway: AttendanceGateway,
  ) {}

  async generateSessionQr(
    sessionId: string,
    dto: GenerateAttendanceQrDto,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const expiresInMinutes =
      dto.expiresInMinutes ?? DEFAULT_QR_EXPIRATION_MINUTES;
    return this.sessionsService.rotateQrTokens(
      sessionId,
      requesterId,
      requesterRole,
      expiresInMinutes,
    );
  }

  async submitAttendance(
    sessionId: string,
    studentId: string,
    dto: SubmitAttendanceDto,
  ): Promise<AttendanceDocument> {
    const session = await this.sessionsService.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const lab = await this.labsService.findById(session.labId.toString());
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }
    const studentObjectId = new Types.ObjectId(studentId);
    const students = lab.students ?? [];
    const isMember = students.some((id) => id.toString() === studentId);
    if (!isMember) {
      throw new ForbiddenException('Student is not enrolled in this lab');
    }

    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      throw new ForbiddenException('Session is not active');
    }

    const status = this.resolveStatus(session, dto.qrToken, now);

    const existingAttendance = await this.attendanceModel
      .findOne({ sessionId: session._id, studentId: studentObjectId })
      .exec();

    if (existingAttendance) {
      return existingAttendance;
    }

    const sessionObjectId = session._id as Types.ObjectId;
    const attendance = await this.attendanceModel.create({
      sessionId: sessionObjectId,
      studentId: studentObjectId,
      status,
      scannedAt: now,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    const student = await this.usersService.findById(studentId);

    this.attendanceGateway.emitAttendanceUpdate({
      sessionId: session.id,
      labId: session.labId.toString(),
      studentId,
      studentName: student?.name,
      status,
      scannedAt: now.toISOString(),
    });

    return attendance;
  }

  async getSessionAttendance(
    sessionId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<AttendanceResponse[]> {
    const session = await this.sessionsService.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const lab = await this.labsService.findById(session.labId.toString());
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!this.canManageLabSession(lab, requesterId, requesterRole)) {
      throw new ForbiddenException(
        'Unauthorized to view attendance for this session',
      );
    }

    const attendanceRecords = await this.attendanceModel
      .find({
        sessionId: new Types.ObjectId(sessionId),
      })
      .exec();

    return attendanceRecords.map((record) =>
      this.formatAttendanceResponse(record),
    );
  }

  async getStudentAttendance(
    studentId: string,
    requesterId: string,
    requesterRole: UserRole,
    labId?: string,
    sessionId?: string,
  ): Promise<AttendanceResponse[]> {
    // Check authorization
    if (studentId !== requesterId) {
      // If not viewing own attendance, must be teacher or admin
      if (requesterRole === UserRole.Teacher) {
        // Teachers can only view students in their labs
        const hasAccess = await this.teacherHasAccessToStudent(
          requesterId,
          studentId,
        );
        if (!hasAccess) {
          throw new ForbiddenException(
            "Unauthorized to view this student's attendance",
          );
        }
      } else if (requesterRole !== UserRole.Admin) {
        throw new ForbiddenException(
          "Unauthorized to view this student's attendance",
        );
      }
    }

    // Build query
    const query: FilterQuery<AttendanceDocument> = {
      studentId: new Types.ObjectId(studentId),
    };

    if (sessionId) {
      query.sessionId = new Types.ObjectId(sessionId);
    } else if (labId) {
      // If filtering by lab, find all sessions for that lab
      const sessionIds = await this.findSessionsByLabId(labId);
      if (sessionIds.length > 0) {
        query.sessionId = { $in: sessionIds };
      } else {
        return []; // No sessions, return empty
      }
    }

    const attendanceRecords = await this.attendanceModel.find(query).exec();

    return attendanceRecords.map((record) =>
      this.formatAttendanceResponse(record),
    );
  }

  private async findSessionsByLabId(labId: string): Promise<Types.ObjectId[]> {
    const sessionModel =
      this.attendanceModel.db.model<SessionDocument>('Session');
    const sessionDocs = await sessionModel
      .find({ labId: new Types.ObjectId(labId) })
      .exec();
    return sessionDocs.map((session) => session._id as Types.ObjectId);
  }

  private async teacherHasAccessToStudent(
    teacherId: string,
    studentId: string,
  ): Promise<boolean> {
    const labModel = this.attendanceModel.db.model<LabDocument>('Lab');
    const labDoc = await labModel
      .findOne({
        teacherId: new Types.ObjectId(teacherId),
        students: new Types.ObjectId(studentId),
      })
      .exec();
    return labDoc !== null;
  }

  private canManageLabSession(
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

  private formatAttendanceResponse(
    attendance: AttendanceDocument,
  ): AttendanceResponse {
    const timestampedAttendance = attendance as AttendanceDocument & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    };

    return {
      id: timestampedAttendance._id.toHexString(),
      sessionId: timestampedAttendance.sessionId.toString(),
      studentId: timestampedAttendance.studentId.toString(),
      status: timestampedAttendance.status,
      scannedAt: timestampedAttendance.scannedAt.toISOString(),
      ipAddress: timestampedAttendance.ipAddress ?? undefined,
      userAgent: timestampedAttendance.userAgent ?? undefined,
      createdAt: timestampedAttendance.createdAt?.toISOString(),
      updatedAt: timestampedAttendance.updatedAt?.toISOString(),
    };
  }

  private resolveStatus(
    session: SessionDocument,
    qrToken: string,
    now: Date,
  ): AttendanceStatus {
    if (qrToken === session.qrStartToken) {
      if (session.qrStartExpiresAt && now > session.qrStartExpiresAt) {
        throw new ForbiddenException('QR code expired');
      }
      return AttendanceStatus.Present;
    }

    if (qrToken === session.qrEndToken) {
      if (session.qrEndExpiresAt && now > session.qrEndExpiresAt) {
        throw new ForbiddenException('QR code expired');
      }
      return AttendanceStatus.Late;
    }

    throw new ForbiddenException('Invalid QR token');
  }
}
