import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LabsModule } from '../labs/labs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage/storage.service';
import { StoredFile, FileSchema } from './schemas/file.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: StoredFile.name, schema: FileSchema }]),
    UsersModule,
    LabsModule,
    SessionsModule,
    AuthModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
})
export class FilesModule {}
