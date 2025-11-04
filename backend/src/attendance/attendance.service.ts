import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
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
    const expiresInMinutes = dto.expiresInMinutes ?? DEFAULT_QR_EXPIRATION_MINUTES;
    return this.sessionsService.rotateQrTokens(sessionId, requesterId, requesterRole, expiresInMinutes);
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
    const students = (lab.students ?? []) as Types.ObjectId[];
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
