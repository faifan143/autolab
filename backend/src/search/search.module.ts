import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import {
  StoredFile,
  FileSchema,
} from '../files/schemas/file.schema';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lab.name, schema: LabSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: StoredFile.name, schema: FileSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}


