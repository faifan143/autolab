import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import {
  Attendance,
  AttendanceSchema,
} from '../attendance/schemas/attendance.schema';
import { Grade, GradeSchema } from '../grading/schemas/grade.schema';
import {
  Complaint,
  ComplaintSchema,
} from '../complaints/schemas/complaint.schema';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lab.name, schema: LabSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Grade.name, schema: GradeSchema },
      { name: Complaint.name, schema: ComplaintSchema },
    ]),
    AttendanceModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
