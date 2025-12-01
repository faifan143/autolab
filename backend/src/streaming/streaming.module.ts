import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabsModule } from '../labs/labs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import { StreamingGateway } from './streaming.gateway';
import { StreamingService } from './streaming.service';
import { MediasoupService } from './mediasoup.service';
import { StreamingController } from './streaming.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Lab.name, schema: LabSchema },
    ]),
    forwardRef(() => SessionsModule),
    LabsModule,
  ],
  controllers: [StreamingController],
  providers: [StreamingGateway, StreamingService, MediasoupService],
  exports: [StreamingService, MediasoupService],
})
export class StreamingModule {}

