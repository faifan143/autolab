import {
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

@Injectable()
export class LabsService {
  constructor(
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createLab(
    dto: CreateLabDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LabDocument> {
    const teacherId = dto.teacherId ?? requesterId;

    if (requesterRole === UserRole.Teacher && teacherId !== requesterId) {
      throw new ForbiddenException('Teachers can only create labs for themselves');
    }

    if (requesterRole === UserRole.Student) {
      throw new ForbiddenException('Students cannot create labs');
    }

    await this.ensureUserExists(teacherId, UserRole.Teacher);

    const studentObjectIds = await this.normalizeStudentIds(dto.studentIds ?? []);

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

  async findById(labId: string): Promise<LabDocument | null> {
    return this.labModel.findById(labId).exec();
  }

  private async normalizeStudentIds(studentIds: string[]): Promise<Types.ObjectId[]> {
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
          throw new ForbiddenException('Only student accounts can be assigned to labs');
        }
        return new Types.ObjectId(studentId);
      }),
    );

    return validStudents;
  }

  private async ensureUserExists(userId: string, role: UserRole): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== role) {
      throw new NotFoundException(`${role} user not found`);
    }
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
