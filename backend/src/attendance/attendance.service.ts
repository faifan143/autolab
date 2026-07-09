import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { LabDocument } from '../labs/schemas/lab.schema';
import { SessionsService } from '../sessions/sessions.service';
import { SessionDocument } from '../sessions/schemas/session.schema';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { GenerateAttendanceQrDto } from './dto/generate-attendance-qr.dto';
import { ScanStudentAttendanceDto } from './dto/scan-student-attendance.dto';
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
  scannedByTeacherId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentCheckInQrResponse {
  token: string;
  expiresAt: string;
}

interface AttendanceCheckInPayload {
  sub: string;
  sessionId: string;
  type: string;
}

const DEFAULT_QR_EXPIRATION_MINUTES = 5;
const DEFAULT_LATE_THRESHOLD_MINUTES = 15;
const STUDENT_CHECKIN_TOKEN_TTL_SECONDS = 30;
const CHECKIN_WINDOW_BEFORE_START_MINUTES = 30;
const ATTENDANCE_CHECKIN_TOKEN_TYPE = 'attendance-checkin';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    private readonly sessionsService: SessionsService,
    private readonly labsService: LabsService,
    private readonly usersService: UsersService,
    private readonly attendanceGateway: AttendanceGateway,
    private readonly jwtService: JwtService,
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

  async generateStudentCheckInQr(
    sessionId: string,
    studentId: string,
    requesterRole: UserRole,
  ): Promise<StudentCheckInQrResponse> {
    if (requesterRole !== UserRole.Student) {
      throw new ForbiddenException('Only students can generate check-in QR codes');
    }

    let session: SessionDocument;
    try {
      session = await this.getSessionForCheckIn(sessionId);
      const lab = await this.getLabForSession(session);
      this.ensureStudentEnrolled(lab, studentId);
      this.ensureWithinCheckInWindow(session);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        const message = error.message;
        this.logger.warn(
          `Student QR denied: sessionId=${sessionId} studentId=${studentId} role=${requesterRole} reason="${message}"`,
        );
      }
      throw error;
    }

    const expiresAt = new Date(
      Date.now() + STUDENT_CHECKIN_TOKEN_TTL_SECONDS * 1000,
    );
    const token = await this.jwtService.signAsync(
      {
        sub: studentId,
        sessionId,
        type: ATTENDANCE_CHECKIN_TOKEN_TYPE,
      },
      { expiresIn: STUDENT_CHECKIN_TOKEN_TTL_SECONDS },
    );

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async scanStudentAttendance(
    sessionId: string,
    teacherId: string,
    teacherRole: UserRole,
    dto: ScanStudentAttendanceDto,
  ): Promise<AttendanceDocument> {
    if (teacherRole !== UserRole.Teacher && teacherRole !== UserRole.Admin) {
      throw new ForbiddenException('Only teachers can scan student QR codes');
    }

    const session = await this.getSessionForCheckIn(sessionId);
    const lab = await this.getLabForSession(session);
    if (!this.canManageLabSession(lab, teacherId, teacherRole)) {
      throw new ForbiddenException(
        'Unauthorized to record attendance for this session',
      );
    }

    const studentId = await this.verifyStudentCheckInToken(
      dto.studentToken,
      sessionId,
    );
    this.ensureStudentEnrolled(lab, studentId);
    this.ensureWithinCheckInWindow(session);

    const now = new Date();
    const status = this.resolveStatusByTime(session, now);

    return this.recordAttendance({
      session,
      studentId,
      status,
      scannedAt: now,
      scannedByTeacherId: teacherId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });
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
    this.ensureStudentEnrolled(lab, studentId);

    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      throw new ForbiddenException('Session is not active');
    }

    const status = this.resolveStatus(session, dto.qrToken, now);

    return this.recordAttendance({
      session,
      studentId,
      status,
      scannedAt: now,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });
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
    if (studentId !== requesterId) {
      if (requesterRole === UserRole.Teacher) {
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

    const query: FilterQuery<AttendanceDocument> = {
      studentId: new Types.ObjectId(studentId),
    };

    if (sessionId) {
      query.sessionId = new Types.ObjectId(sessionId);
    } else if (labId) {
      const sessionIds = await this.findSessionsByLabId(labId);
      if (sessionIds.length > 0) {
        query.sessionId = { $in: sessionIds };
      } else {
        return [];
      }
    }

    const attendanceRecords = await this.attendanceModel.find(query).exec();

    return attendanceRecords.map((record) =>
      this.formatAttendanceResponse(record),
    );
  }

  private async recordAttendance(params: {
    session: SessionDocument;
    studentId: string;
    status: AttendanceStatus;
    scannedAt: Date;
    scannedByTeacherId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AttendanceDocument> {
    const {
      session,
      studentId,
      status,
      scannedAt,
      scannedByTeacherId,
      ipAddress,
      userAgent,
    } = params;

    const studentObjectId = new Types.ObjectId(studentId);
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
      scannedAt,
      scannedByTeacherId: scannedByTeacherId
        ? new Types.ObjectId(scannedByTeacherId)
        : undefined,
      ipAddress,
      userAgent,
    });

    const student = await this.usersService.findById(studentId);

    this.attendanceGateway.emitAttendanceUpdate({
      sessionId: session.id,
      labId: session.labId.toString(),
      studentId,
      studentName: student?.name,
      status,
      scannedAt: scannedAt.toISOString(),
    });

    const summary = await this.attendanceModel
      .aggregate<{
        _id: Types.ObjectId;
        present: number;
        late: number;
      }>([
        { $match: { sessionId: sessionObjectId } },
        {
          $group: {
            _id: '$sessionId',
            present: {
              $sum: {
                $cond: [
                  { $eq: ['$status', AttendanceStatus.Present] },
                  1,
                  0,
                ],
              },
            },
            late: {
              $sum: {
                $cond: [
                  { $eq: ['$status', AttendanceStatus.Late] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .exec();

    const s = summary[0];
    if (s) {
      const present = s.present ?? 0;
      const late = s.late ?? 0;
      const total = present + late;

      this.attendanceGateway.emitAttendanceSummary({
        sessionId: session.id,
        labId: session.labId.toString(),
        present,
        late,
        total,
      });
    }

    return attendance;
  }

  private async getSessionForCheckIn(
    sessionId: string,
  ): Promise<SessionDocument> {
    const session = await this.sessionsService.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private async getLabForSession(session: SessionDocument): Promise<LabDocument> {
    const lab = await this.labsService.findById(session.labId.toString());
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }
    return lab;
  }

  private ensureStudentEnrolled(lab: LabDocument, studentId: string): void {
    const students = lab.students ?? [];
    const isMember = students.some((id) => id.toString() === studentId);
    if (!isMember) {
      throw new ForbiddenException('Student is not enrolled in this lab');
    }
  }

  private ensureWithinCheckInWindow(session: SessionDocument): void {
    // While the teacher is live, keep attendance QR available even if the
    // scheduled wall-clock window already ended (common in demos / late start).
    if (session.isStreaming) {
      return;
    }

    const now = new Date();
    const windowStart = new Date(
      session.startTime.getTime() -
        CHECKIN_WINDOW_BEFORE_START_MINUTES * 60 * 1000,
    );

    if (now < windowStart || now > session.endTime) {
      throw new ForbiddenException(
        'Session check-in is not open. Attendance QR is available from 30 minutes before the session starts until it ends (or while the teacher is live).',
      );
    }
  }

  private async verifyStudentCheckInToken(
    studentToken: string,
    sessionId: string,
  ): Promise<string> {
    let payload: AttendanceCheckInPayload;
    try {
      payload = await this.jwtService.verifyAsync<AttendanceCheckInPayload>(
        studentToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired student QR code');
    }

    if (
      payload.type !== ATTENDANCE_CHECKIN_TOKEN_TYPE ||
      payload.sessionId !== sessionId ||
      !payload.sub
    ) {
      throw new UnauthorizedException('Invalid student QR code for this session');
    }

    return payload.sub;
  }

  private resolveStatusByTime(
    session: SessionDocument,
    scannedAt: Date,
  ): AttendanceStatus {
    const lateThresholdMinutes =
      session.lateThresholdMinutes ?? DEFAULT_LATE_THRESHOLD_MINUTES;
    const lateCutoff = new Date(
      session.startTime.getTime() + lateThresholdMinutes * 60 * 1000,
    );

    if (scannedAt <= lateCutoff) {
      return AttendanceStatus.Present;
    }

    if (scannedAt <= session.endTime) {
      return AttendanceStatus.Late;
    }

    throw new ForbiddenException('Session is not active');
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
      scannedByTeacherId:
        timestampedAttendance.scannedByTeacherId?.toString() ?? undefined,
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
