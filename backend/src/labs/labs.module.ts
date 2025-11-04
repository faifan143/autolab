import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';
import { Lab, LabSchema } from './schemas/lab.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lab.name, schema: LabSchema }]),
    UsersModule,
  ],
  providers: [LabsService],
  controllers: [LabsController],
  exports: [LabsService],
})
export class LabsModule {}
