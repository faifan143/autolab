import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Lab, LabDocument } from '../labs/schemas/lab.schema';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  suspendedAt?: string;
  suspendReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsersListResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Lab.name) private readonly labModel: Model<LabDocument>,
  ) {}

  async create(user: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel(user);
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async existsByRole(role: UserRole): Promise<boolean> {
    const exists = await this.userModel.exists({ role });
    return Boolean(exists);
  }

  async findOne(
    userId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<UserResponse> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check authorization
    if (userId === requesterId) {
      // Users can always view their own profile
      return this.formatUserResponse(user);
    }

    if (requesterRole === UserRole.Admin) {
      // Admins can view any user
      return this.formatUserResponse(user);
    }

    if (requesterRole === UserRole.Teacher && user.role === UserRole.Student) {
      // Teachers can view students enrolled in their labs
      const hasAccess = await this.teacherHasAccessToStudent(
        requesterId,
        userId,
      );
      if (hasAccess) {
        return this.formatUserResponse(user);
      }
    }

    throw new ForbiddenException('Unauthorized to view this profile');
  }

  async findAll(
    requesterId: string,
    requesterRole: UserRole,
    role?: UserRole,
    search?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<UsersListResponse> {
    // Only teachers and admins can search users
    if (requesterRole === UserRole.Student) {
      throw new ForbiddenException('Students cannot search users');
    }

    // Teachers can only search students
    if (
      requesterRole === UserRole.Teacher &&
      role &&
      role !== UserRole.Student
    ) {
      throw new ForbiddenException('Teachers can only search for students');
    }

    // Build query
    const query: FilterQuery<UserDocument> = {};

    if (requesterRole === UserRole.Teacher) {
      // Force role to be student for teachers
      query.role = UserRole.Student;
    } else if (role) {
      // Admins can filter by any role
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Limit between 1 and 100
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const [users, total] = await Promise.all([
      this.userModel.find(query).skip(safeOffset).limit(safeLimit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      users: users.map((user) => this.formatUserResponse(user)),
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    requesterRole: UserRole,
  ): Promise<UserResponse> {
    this.ensureAdmin(requesterRole);
    this.ensureUpdatePayload(dto);

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureUserIsManageable(user);

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      user.email = normalizedEmail;
    }

    await user.save();
    return this.formatUserResponse(user);
  }

  async updateUserSuspension(
    userId: string,
    isSuspended: boolean,
    suspendReason: string | undefined,
    requesterRole: UserRole,
  ): Promise<UserResponse> {
    this.ensureAdmin(requesterRole);

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.Admin) {
      throw new ForbiddenException('Cannot suspend administrator accounts');
    }

    user.isSuspended = isSuspended;
    if (isSuspended) {
      user.suspendedAt = new Date();
      user.suspendReason = suspendReason?.trim();
    } else {
      user.suspendedAt = undefined;
      user.suspendReason = undefined;
    }

    await user.save();
    return this.formatUserResponse(user);
  }

  async updateUsersBulk(
    userIds: string[],
    dto: UpdateUserDto,
    requesterRole: UserRole,
  ): Promise<UserResponse[]> {
    const uniqueIds = [...new Set(userIds)];
    return Promise.all(
      uniqueIds.map((id) => this.updateUser(id, dto, requesterRole)),
    );
  }

  async deleteUser(userId: string, requesterRole: UserRole): Promise<void> {
    this.ensureAdmin(requesterRole);

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureUserIsManageable(user);

    if (user.role === UserRole.Student) {
      await this.labModel
        .updateMany(
          { students: user._id as Types.ObjectId },
          { $pull: { students: user._id as Types.ObjectId } },
        )
        .exec();
    }

    if (user.role === UserRole.Teacher) {
      const labsCount = await this.labModel
        .countDocuments({ teacherId: user._id as Types.ObjectId })
        .exec();
      if (labsCount > 0) {
        throw new ForbiddenException(
          'Cannot delete a teacher who is assigned to labs',
        );
      }
    }

    await user.deleteOne();
  }

  async deleteUsersBulk(
    userIds: string[],
    requesterRole: UserRole,
  ): Promise<number> {
    const uniqueIds = [...new Set(userIds)];
    let deleted = 0;

    for (const id of uniqueIds) {
      await this.deleteUser(id, requesterRole);
      deleted += 1;
    }

    return deleted;
  }

  private async teacherHasAccessToStudent(
    teacherId: string,
    studentId: string,
  ): Promise<boolean> {
    const lab = await this.labModel
      .findOne({
        teacherId: new Types.ObjectId(teacherId),
        students: new Types.ObjectId(studentId),
      })
      .exec();
    return lab !== null;
  }

  private formatUserResponse(user: UserDocument): UserResponse {
    const timestampedUser = user as UserDocument & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    };
    return {
      id: timestampedUser._id.toHexString(),
      name: timestampedUser.name,
      email: timestampedUser.email,
      role: timestampedUser.role,
      isSuspended: timestampedUser.isSuspended ?? false,
      suspendedAt: timestampedUser.suspendedAt
        ? timestampedUser.suspendedAt.toISOString()
        : undefined,
      suspendReason: timestampedUser.suspendReason ?? undefined,
      createdAt: timestampedUser.createdAt?.toISOString(),
      updatedAt: timestampedUser.updatedAt?.toISOString(),
    };
  }

  private ensureAdmin(role: UserRole): void {
    if (role !== UserRole.Admin) {
      throw new ForbiddenException('Only administrators can manage users');
    }
  }

  private ensureUserIsManageable(user: UserDocument): void {
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException('Cannot modify administrator accounts');
    }

    if (user.role !== UserRole.Teacher && user.role !== UserRole.Student) {
      throw new ForbiddenException(
        'Only teacher and student accounts can be managed',
      );
    }
  }

  private ensureUpdatePayload(dto: UpdateUserDto): void {
    if (dto.name === undefined && dto.email === undefined) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }
  }
}
