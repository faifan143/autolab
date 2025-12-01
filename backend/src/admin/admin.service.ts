import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';
import {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
} from '../attendance/schemas/attendance.schema';
import { Grade, GradeDocument } from '../grading/schemas/grade.schema';
import {
  Complaint,
  ComplaintDocument,
  ComplaintStatus,
} from '../complaints/schemas/complaint.schema';
import { ReportRangeDto } from './dto/report-range.dto';

export interface AdminOverview {
  labs: {
    total: number;
    archived: number;
    suspended: number;
  };
  users: {
    total: number;
    byRole: Record<UserRole, number>;
    suspended: number;
  };
  sessions: {
    total: number;
    activeToday: number;
  };
  complaints: {
    total: number;
    pending: number;
  };
  attendance: {
    present: number;
    late: number;
    rangeDays: number;
  };
}

export interface AttendanceReportItem {
  sessionId: string;
  labId: string;
  present: number;
  late: number;
  total: number;
}

export interface AttendanceReport {
  summary: {
    present: number;
    late: number;
    total: number;
  };
  items: AttendanceReportItem[];
}

export interface GradeReportItem {
  labId: string;
  averageScore: number | null;
  totalGrades: number;
}

export interface GradeReport {
  summary: {
    totalGrades: number;
    averageScore: number | null;
  };
  items: GradeReportItem[];
}

export interface ArchivedLabResponse {
  id: string;
  name: string;
  teacherId: string;
  archivedAt?: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Grade.name) private readonly gradeModel: Model<GradeDocument>,
    @InjectModel(Complaint.name)
    private readonly complaintModel: Model<ComplaintDocument>,
  ) {}

  async getOverview(): Promise<AdminOverview> {
    const [
      labStats,
      userStats,
      sessionsToday,
      totalSessions,
      attendanceStats,
      complaintsStats,
    ] = await Promise.all([
      this.computeLabStats(),
      this.computeUserStats(),
      this.countActiveSessionsToday(),
      this.sessionModel.countDocuments().exec(),
      this.computeAttendanceStats(7),
      this.computeComplaintStats(),
    ]);

    return {
      labs: labStats,
      users: userStats,
      sessions: {
        total: totalSessions,
        activeToday: sessionsToday,
      },
      complaints: complaintsStats,
      attendance: attendanceStats,
    };
  }

  async getAttendanceReport(query: ReportRangeDto): Promise<AttendanceReport> {
    const { sessionIds, sessionMap } = await this.collectSessions(query);
    if (!sessionIds.length) {
      return {
        summary: { present: 0, late: 0, total: 0 },
        items: [],
      };
    }

    const attendanceRecords = await this.attendanceModel
      .find({ sessionId: { $in: sessionIds } })
      .exec();

    const bySession = new Map<string, AttendanceReportItem>();
    let totalPresent = 0;
    let totalLate = 0;

    for (const record of attendanceRecords) {
      const sessionId = record.sessionId.toString();
      const sessionInfo = sessionMap.get(sessionId);
      if (!sessionInfo) {
        continue;
      }

      let item = bySession.get(sessionId);
      if (!item) {
        item = {
          sessionId,
          labId: sessionInfo.labId,
          present: 0,
          late: 0,
          total: 0,
        };
        bySession.set(sessionId, item);
      }

      if (record.status === AttendanceStatus.Present) {
        item.present += 1;
        totalPresent += 1;
      } else if (record.status === AttendanceStatus.Late) {
        item.late += 1;
        totalLate += 1;
      }
      item.total += 1;
    }

    const items = Array.from(bySession.values()).sort((a, b) =>
      a.sessionId.localeCompare(b.sessionId),
    );

    return {
      summary: {
        present: totalPresent,
        late: totalLate,
        total: totalPresent + totalLate,
      },
      items,
    };
  }

  async getGradeReport(query: ReportRangeDto): Promise<GradeReport> {
    const gradeFilter: Record<string, unknown> = {};

    if (query.labId) {
      gradeFilter.labId = new Types.ObjectId(query.labId);
    }

    if (query.from || query.to) {
      gradeFilter.updatedAt = {};
      if (query.from) {
        (gradeFilter.updatedAt as Record<string, Date>).$gte = new Date(
          query.from,
        );
      }
      if (query.to) {
        (gradeFilter.updatedAt as Record<string, Date>).$lte = new Date(
          query.to,
        );
      }
    }

    const grades = await this.gradeModel.find(gradeFilter).exec();
    if (!grades.length) {
      return {
        summary: { totalGrades: 0, averageScore: null },
        items: [],
      };
    }

    const byLab = new Map<string, { total: number; sum: number }>();
    let total = 0;
    let sum = 0;

    for (const grade of grades) {
      const labId = grade.labId.toString();
      let entry = byLab.get(labId);
      if (!entry) {
        entry = { total: 0, sum: 0 };
        byLab.set(labId, entry);
      }
      entry.total += 1;
      entry.sum += grade.score;
      total += 1;
      sum += grade.score;
    }

    const items: GradeReportItem[] = Array.from(byLab.entries()).map(
      ([labId, entry]) => ({
        labId,
        totalGrades: entry.total,
        averageScore:
          entry.total > 0
            ? Math.round((entry.sum / entry.total) * 100) / 100
            : null,
      }),
    );

    return {
      summary: {
        totalGrades: total,
        averageScore: total > 0 ? Math.round((sum / total) * 100) / 100 : null,
      },
      items,
    };
  }

  async listArchivedLabs(): Promise<ArchivedLabResponse[]> {
    const labs = await this.labModel.find({ isArchived: true }).exec();
    return labs.map((lab) => ({
      id:
        lab._id instanceof Types.ObjectId
          ? lab._id.toHexString()
          : String(lab._id),
      name: lab.name,
      teacherId: lab.teacherId.toString(),
      archivedAt: lab.archivedAt?.toISOString(),
    }));
  }

  private async computeLabStats(): Promise<{
    total: number;
    archived: number;
    suspended: number;
  }> {
    const [total, archived, suspended] = await Promise.all([
      this.labModel.countDocuments().exec(),
      this.labModel.countDocuments({ isArchived: true }).exec(),
      this.labModel.countDocuments({ isSuspended: true }).exec(),
    ]);
    return { total, archived, suspended };
  }

  private async computeUserStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    suspended: number;
  }> {
    const [total, students, teachers, admins, suspended] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ role: UserRole.Student }).exec(),
      this.userModel.countDocuments({ role: UserRole.Teacher }).exec(),
      this.userModel.countDocuments({ role: UserRole.Admin }).exec(),
      this.userModel.countDocuments({ isSuspended: true }).exec(),
    ]);

    return {
      total,
      byRole: {
        [UserRole.Student]: students,
        [UserRole.Teacher]: teachers,
        [UserRole.Admin]: admins,
      },
      suspended,
    };
  }

  private async countActiveSessionsToday(): Promise<number> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return this.sessionModel
      .countDocuments({
        startTime: { $lte: end },
        endTime: { $gte: start },
      })
      .exec();
  }

  private async computeAttendanceStats(
    rangeDays: number,
  ): Promise<{ present: number; late: number; rangeDays: number }> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (rangeDays - 1));
    fromDate.setHours(0, 0, 0, 0);

    const [present, late] = await Promise.all([
      this.attendanceModel
        .countDocuments({
          scannedAt: { $gte: fromDate },
          status: AttendanceStatus.Present,
        })
        .exec(),
      this.attendanceModel
        .countDocuments({
          scannedAt: { $gte: fromDate },
          status: AttendanceStatus.Late,
        })
        .exec(),
    ]);

    return { present, late, rangeDays };
  }

  private async computeComplaintStats(): Promise<{
    total: number;
    pending: number;
  }> {
    const [total, pending] = await Promise.all([
      this.complaintModel.countDocuments().exec(),
      this.complaintModel
        .countDocuments({ status: ComplaintStatus.New })
        .exec(),
    ]);
    return { total, pending };
  }

  private async collectSessions(query: ReportRangeDto): Promise<{
    sessionIds: Types.ObjectId[];
    sessionMap: Map<string, { labId: string }>;
  }> {
    const sessionFilter: Record<string, unknown> = {};

    if (query.labId) {
      sessionFilter.labId = new Types.ObjectId(query.labId);
    }

    if (query.from || query.to) {
      sessionFilter.startTime = {};
      if (query.from) {
        (sessionFilter.startTime as Record<string, Date>).$gte = new Date(
          query.from,
        );
      }
      if (query.to) {
        (sessionFilter.startTime as Record<string, Date>).$lte = new Date(
          query.to,
        );
      }
    }

    const sessions = await this.sessionModel
      .find(sessionFilter)
      .select({ _id: 1, labId: 1 })
      .exec();

    const sessionIds = sessions.map((session) => session._id as Types.ObjectId);
    const map = new Map<string, { labId: string }>();
    for (const session of sessions) {
      const sessionId =
        session._id instanceof Types.ObjectId
          ? session._id.toHexString()
          : String(session._id);
      const labId =
        session.labId instanceof Types.ObjectId
          ? session.labId.toHexString()
          : String(session.labId);
      map.set(sessionId, {
        labId,
      });
    }
    return { sessionIds, sessionMap: map };
  }
}
