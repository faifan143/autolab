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
import { AttendanceGateway } from '../attendance/attendance.gateway';

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
    private readonly attendanceGateway: AttendanceGateway,
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

    const overview: AdminOverview = {
      labs: labStats,
      users: userStats,
      sessions: {
        total: totalSessions,
        activeToday: sessionsToday,
      },
      complaints: complaintsStats,
      attendance: attendanceStats,
    };

    // Emit realtime overview update for dashboards.
    this.attendanceGateway.emitDashboardOverview(overview);

    return overview;
  }

  async getAttendanceReport(query: ReportRangeDto): Promise<AttendanceReport> {
    /**
     * Optimize attendance report by aggregating directly on the Session
     * collection with a $lookup into Attendance, instead of:
     *   1) fetching sessions,
     *   2) fetching all attendance records,
     *   3) grouping in memory.
     *
     * The response shape remains identical:
     * {
     *   summary: { present, late, total },
     *   items: [{ sessionId, labId, present, late, total }]
     * }
     */

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

    const [result] = await this.sessionModel
      .aggregate<{
        items: {
          sessionId: Types.ObjectId;
          labId: Types.ObjectId;
          present: number;
          late: number;
          total: number;
        }[];
        summary: {
          present: number;
          late: number;
          total: number;
        }[];
      }>([
        { $match: sessionFilter },
        {
          $lookup: {
            from: this.attendanceModel.collection.name,
            localField: '_id',
            foreignField: 'sessionId',
            as: 'attendance',
          },
        },
        { $unwind: { path: '$attendance', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            labId: { $first: '$labId' },
            present: {
              $sum: {
                $cond: [
                  { $eq: ['$attendance.status', AttendanceStatus.Present] },
                  1,
                  0,
                ],
              },
            },
            late: {
              $sum: {
                $cond: [
                  { $eq: ['$attendance.status', AttendanceStatus.Late] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            sessionId: '$_id',
            labId: 1,
            present: 1,
            late: 1,
            total: { $add: ['$present', '$late'] },
          },
        },
        {
          $facet: {
            items: [{ $sort: { sessionId: 1 } }],
            summary: [
              {
                $group: {
                  _id: null,
                  present: { $sum: '$present' },
                  late: { $sum: '$late' },
                  total: { $sum: '$total' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    // No matching sessions -> preserve original behavior
    if (!result || !result.items.length) {
      return {
        summary: { present: 0, late: 0, total: 0 },
        items: [],
      };
    }

    const items: AttendanceReportItem[] = result.items.map((item) => ({
      sessionId:
        item.sessionId instanceof Types.ObjectId
          ? item.sessionId.toHexString()
          : String(item.sessionId),
      labId:
        item.labId instanceof Types.ObjectId
          ? item.labId.toHexString()
          : String(item.labId),
      present: item.present ?? 0,
      late: item.late ?? 0,
      total: item.total ?? 0,
    }));

    const summaryDoc = result.summary[0];
    const present = summaryDoc?.present ?? 0;
    const late = summaryDoc?.late ?? 0;
    const total = summaryDoc?.total ?? present + late;

    return {
      summary: {
        present,
        late,
        total,
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

    /**
     * Optimize grade report aggregation by using a single pipeline with
     * per-lab grouping and an overall summary, instead of fetching all
     * grades and aggregating in memory.
     */

    const [result] = await this.gradeModel
      .aggregate<{
        items: { labId: Types.ObjectId; totalGrades: number; averageScore: number | null }[];
        summary: { totalGrades: number; averageScore: number | null }[];
      }>([
        { $match: gradeFilter },
        {
          $group: {
            _id: '$labId',
            totalGrades: { $sum: 1 },
            sumScore: { $sum: '$score' },
          },
        },
        {
          $project: {
            _id: 0,
            labId: '$_id',
            totalGrades: 1,
            averageScore: {
              $cond: [
                { $gt: ['$totalGrades', 0] },
                { $divide: ['$sumScore', '$totalGrades'] },
                null,
              ],
            },
          },
        },
        {
          $facet: {
            items: [{ $sort: { labId: 1 } }],
            summary: [
              {
                $group: {
                  _id: null,
                  totalGrades: { $sum: '$totalGrades' },
                  sumScore: { $sum: { $multiply: ['$averageScore', '$totalGrades'] } },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalGrades: 1,
                  averageScore: {
                    $cond: [
                      { $gt: ['$totalGrades', 0] },
                      { $divide: ['$sumScore', '$totalGrades'] },
                      null,
                    ],
                  },
                },
              },
            ],
          },
        },
      ])
      .exec();

    if (!result || !result.items.length) {
      return {
        summary: { totalGrades: 0, averageScore: null },
        items: [],
      };
    }

    const items: GradeReportItem[] = result.items.map((item) => ({
      labId:
        item.labId instanceof Types.ObjectId
          ? item.labId.toHexString()
          : String(item.labId),
      totalGrades: item.totalGrades ?? 0,
      // Preserve original rounding behavior to 2 decimal places
      averageScore:
        item.averageScore != null
          ? Math.round(item.averageScore * 100) / 100
          : null,
    }));

    const summaryDoc = result.summary[0];
    const totalGrades = summaryDoc?.totalGrades ?? 0;
    const summaryAvg =
      summaryDoc?.averageScore != null ? summaryDoc.averageScore : null;

    return {
      summary: {
        totalGrades,
        averageScore:
          summaryAvg != null ? Math.round(summaryAvg * 100) / 100 : null,
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
    /**
     * Use a single aggregation instead of three separate countDocuments calls.
     */
    const [result] = await this.labModel
      .aggregate<{
        total: number;
        archived: number;
        suspended: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            archived: {
              $sum: {
                $cond: [{ $eq: ['$isArchived', true] }, 1, 0],
              },
            },
            suspended: {
              $sum: {
                $cond: [{ $eq: ['$isSuspended', true] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            archived: 1,
            suspended: 1,
          },
        },
      ])
      .exec();

    return {
      total: result?.total ?? 0,
      archived: result?.archived ?? 0,
      suspended: result?.suspended ?? 0,
    };
  }

  private async computeUserStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    suspended: number;
  }> {
    /**
     * Single aggregation to compute:
     * - total users
     * - counts per role
     * - total suspended users
     */
    const roleCounts = await this.userModel
      .aggregate<{
        _id: { role: UserRole; isSuspended: boolean };
        count: number;
      }>([
        {
          $group: {
            _id: { role: '$role', isSuspended: '$isSuspended' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    let total = 0;
    const byRole: Record<UserRole, number> = {
      [UserRole.Student]: 0,
      [UserRole.Teacher]: 0,
      [UserRole.Admin]: 0,
    };
    let suspended = 0;

    for (const entry of roleCounts) {
      const { role, isSuspended } = entry._id;
      const count = entry.count ?? 0;
      total += count;

      if (role in byRole) {
        byRole[role] += count;
      }

      if (isSuspended) {
        suspended += count;
      }
    }

    return {
      total,
      byRole,
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

    const results = await this.attendanceModel
      .aggregate<{
        _id: AttendanceStatus;
        count: number;
      }>([
        {
          $match: {
            scannedAt: { $gte: fromDate },
            status: { $in: [AttendanceStatus.Present, AttendanceStatus.Late] },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    let present = 0;
    let late = 0;

    for (const entry of results) {
      if (entry._id === AttendanceStatus.Present) {
        present = entry.count ?? 0;
      } else if (entry._id === AttendanceStatus.Late) {
        late = entry.count ?? 0;
      }
    }

    return { present, late, rangeDays };
  }

  private async computeComplaintStats(): Promise<{
    total: number;
    pending: number;
  }> {
    /**
     * Aggregate complaint stats in a single pass.
     */
    const [result] = await this.complaintModel
      .aggregate<{
        total: number;
        pending: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ComplaintStatus.New] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            pending: 1,
          },
        },
      ])
      .exec();

    return {
      total: result?.total ?? 0,
      pending: result?.pending ?? 0,
    };
  }
}
