import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LabsModule } from '../labs/labs.module';
import { UsersModule } from '../users/users.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { Grade, GradeSchema } from './schemas/grade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Grade.name, schema: GradeSchema }]),
    LabsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [GradingController],
  providers: [GradingService],
})
export class GradingModule {}
