import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabsService } from '../labs/labs.service';
import { FirebaseNotificationsService } from '../integrations/firebase/firebase-notifications.service';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { Grade, GradeDocument } from './schemas/grade.schema';

@Injectable()
export class GradingService {
  constructor(
    @InjectModel(Grade.name) private readonly gradeModel: Model<GradeDocument>,
    private readonly labsService: LabsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: FirebaseNotificationsService,
  ) {}

  async createGrade(
    dto: CreateGradeDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<GradeDocument> {
    const lab = await this.labsService.findById(dto.labId);
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (
      requesterRole === UserRole.Teacher &&
      lab.teacherId.toString() !== requesterId
    ) {
      throw new ForbiddenException('Teachers can only grade their labs');
    }

    if (requesterRole === UserRole.Student) {
      throw new ForbiddenException('Students cannot create grades');
    }

    const student = await this.usersService.findById(dto.studentId);
    if (!student || student.role !== UserRole.Student) {
      throw new NotFoundException('Student not found');
    }

    const studentIsEnrolled = lab.students.some(
      (id) => id.toString() === dto.studentId,
    );
    if (!studentIsEnrolled) {
      throw new ForbiddenException('Student is not enrolled in this lab');
    }

    const grade = await this.gradeModel.findOneAndUpdate(
      {
        studentId: new Types.ObjectId(dto.studentId),
        labId: new Types.ObjectId(dto.labId),
        category: dto.category,
      },
      {
        $set: {
          score: dto.score,
          maxScore: dto.maxScore,
          comment: dto.comment,
          gradedBy: new Types.ObjectId(requesterId),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await this.notifyGradePublished(grade, student.fcmTokens ?? [], lab.name);

    return grade;
  }

  async getGradesForUser(
    userId: string,
    requesterId: string,
    requesterRole: UserRole,
    labId?: string,
  ): Promise<GradeDocument[]> {
    if (
      requesterRole === UserRole.Student &&
      requesterId !== userId
    ) {
      throw new ForbiddenException('Students can only view their own grades');
    }

    const filter: Record<string, unknown> = {
      studentId: new Types.ObjectId(userId),
    };
    if (labId) {
      filter.labId = new Types.ObjectId(labId);
    }

    return this.gradeModel.find(filter).exec();
  }

  async getGradesForLab(
    labId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<GradeDocument[]> {
    const lab = await this.labsService.findById(labId);
    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (
      requesterRole === UserRole.Teacher &&
      lab.teacherId.toString() !== requesterId
    ) {
      throw new ForbiddenException('Unauthorized to view this lab grades');
    }

    if (requesterRole === UserRole.Student) {
      const isStudentEnrolled = lab.students.some(
        (id) => id.toString() === requesterId,
      );
      if (!isStudentEnrolled) {
        throw new ForbiddenException('Unauthorized to view this lab grades');
      }
    }

    return this.gradeModel
      .find({ labId: new Types.ObjectId(labId) })
      .exec();
  }

  private async notifyGradePublished(
    grade: GradeDocument,
    tokens: string[],
    labName?: string,
  ): Promise<void> {
    if (!tokens.length) {
      return;
    }

    const updatedAt =
      (grade as GradeDocument & { updatedAt?: Date }).updatedAt ?? new Date();

    await this.notificationsService.sendMulticast({
      tokens,
      notification: {
        title: labName ? `${labName} – grade updated` : 'New grade published',
        body: `${grade.category}: ${grade.score}${
          grade.maxScore ? ` / ${grade.maxScore}` : ''
        }`,
      },
      data: {
        type: 'GRADE_PUBLISHED',
        gradeId: grade.id,
        labId: grade.labId.toString(),
        category: grade.category,
        score: String(grade.score),
        maxScore: grade.maxScore ? String(grade.maxScore) : '',
        gradedAt: new Date(updatedAt).toISOString(),
      },
    });
  }
}
