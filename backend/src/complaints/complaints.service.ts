import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  Complaint,
  ComplaintDocument,
  ComplaintStatus,
} from './schemas/complaint.schema';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';

export interface ComplaintResponse {
  id: string;
  content: string;
  isAnonymous: boolean;
  status: ComplaintStatus;
  labId?: string;
  teacherId?: string;
  reporterId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PaginatedComplaints {
  total: number;
  limit: number;
  offset: number;
  items: ComplaintResponse[];
}

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name)
    private readonly complaintModel: Model<ComplaintDocument>,
    @InjectModel(Lab.name)
    private readonly labModel: Model<LabDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createComplaint(
    dto: CreateComplaintDto,
    reporterId: string,
  ): Promise<ComplaintResponse> {
    const reporterObjectId = new Types.ObjectId(reporterId);

    if (dto.labId) {
      const lab = await this.labModel.findById(dto.labId).exec();
      if (!lab) {
        throw new NotFoundException('Lab not found');
      }

      const isParticipant =
        lab.teacherId.toString() === reporterId ||
        (lab.students ?? []).some((id) => id.toString() === reporterId);

      if (!isParticipant) {
        throw new ForbiddenException('You are not part of this lab');
      }
    }

    if (dto.teacherId) {
      const teacher = await this.userModel.findById(dto.teacherId).exec();
      if (!teacher || teacher.role !== UserRole.Teacher) {
        throw new NotFoundException('Teacher not found');
      }
    }

    const complaint = await this.complaintModel.create({
      reporterId: reporterObjectId,
      teacherId: dto.teacherId ? new Types.ObjectId(dto.teacherId) : undefined,
      labId: dto.labId ? new Types.ObjectId(dto.labId) : undefined,
      content: dto.content.trim(),
      isAnonymous: dto.isAnonymous ?? false,
    });

    return this.toResponse(complaint, false);
  }

  async findStudentComplaints(studentId: string): Promise<ComplaintResponse[]> {
    const complaints = await this.complaintModel
      .find({ reporterId: new Types.ObjectId(studentId) })
      .sort({ createdAt: -1 })
      .exec();

    return complaints.map((complaint) => this.toResponse(complaint, false));
  }

  async findAdminComplaints(
    query: QueryComplaintsDto,
  ): Promise<PaginatedComplaints> {
    const filters: FilterQuery<ComplaintDocument> = {};

    if (query.labId) {
      filters.labId = new Types.ObjectId(query.labId);
    }

    if (query.teacherId) {
      filters.teacherId = new Types.ObjectId(query.teacherId);
    }

    if (query.reporterId) {
      filters.reporterId = new Types.ObjectId(query.reporterId);
    }

    if (query.statuses && query.statuses.length > 0) {
      filters.status = { $in: query.statuses };
    }

    if (query.from || query.to) {
      filters.createdAt = {};
      if (query.from) {
        (filters.createdAt as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        (filters.createdAt as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.complaintModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.complaintModel.countDocuments(filters).exec(),
    ]);

    return {
      total,
      limit,
      offset,
      items: items.map((item) => this.toResponse(item, true)),
    };
  }

  async findAdminComplaint(id: string): Promise<ComplaintResponse> {
    const complaint = await this.complaintModel.findById(id).exec();
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return this.toResponse(complaint, true);
  }

  async updateStatus(
    id: string,
    adminId: string,
    dto: UpdateComplaintStatusDto,
  ): Promise<ComplaintResponse> {
    const complaint = await this.complaintModel.findById(id).exec();
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    complaint.status = dto.status;
    complaint.adminNote = dto.adminNote ?? complaint.adminNote;

    if (
      dto.status === ComplaintStatus.Resolved ||
      dto.status === ComplaintStatus.Dismissed
    ) {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = new Types.ObjectId(adminId);
    } else {
      complaint.resolvedAt = undefined;
      complaint.resolvedBy = undefined;
    }

    await complaint.save();
    return this.toResponse(complaint, true);
  }

  private toResponse(
    complaint: ComplaintDocument,
    includeReporter: boolean,
  ): ComplaintResponse {
    const complaintWithTimestamps = complaint as ComplaintDocument & {
      createdAt: Date;
      updatedAt: Date;
      id: string;
    };
    const reporterId = this.toHexString(complaintWithTimestamps.reporterId);
    const labId = this.toHexString(complaintWithTimestamps.labId);
    const teacherId = this.toHexString(complaintWithTimestamps.teacherId);
    const resolvedBy = this.toHexString(complaintWithTimestamps.resolvedBy);

    return {
      id: complaintWithTimestamps.id,
      content: complaintWithTimestamps.content,
      isAnonymous: complaintWithTimestamps.isAnonymous,
      status: complaintWithTimestamps.status,
      labId,
      teacherId,
      reporterId:
        includeReporter || !complaintWithTimestamps.isAnonymous
          ? reporterId
          : undefined,
      adminNote: complaintWithTimestamps.adminNote,
      createdAt: complaintWithTimestamps.createdAt.toISOString(),
      updatedAt: complaintWithTimestamps.updatedAt.toISOString(),
      resolvedAt: complaintWithTimestamps.resolvedAt
        ? complaintWithTimestamps.resolvedAt.toISOString()
        : undefined,
      resolvedBy,
    };
  }

  private toHexString(
    value: Types.ObjectId | string | undefined | null,
  ): string | undefined {
    if (!value) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }
    return undefined;
  }
}
