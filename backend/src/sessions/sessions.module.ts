import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabsModule } from '../labs/labs.module';
import { FilesModule } from '../files/files.module';
import { StreamingModule } from '../streaming/streaming.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { Session, SessionSchema } from './schemas/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    LabsModule,
    forwardRef(() => FilesModule),
    forwardRef(() => StreamingModule),
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
