import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';
import { Lab, LabSchema } from './schemas/lab.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lab.name, schema: LabSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    UsersModule,
  ],
  providers: [LabsService],
  controllers: [LabsController],
  exports: [LabsService],
})
export class LabsModule {}
