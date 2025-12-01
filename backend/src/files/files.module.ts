import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BackblazeModule } from '../integrations/backblaze/backblaze.module';
import { LabsModule } from '../labs/labs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StoredFile, FileSchema } from './schemas/file.schema';

@Module({
  imports: [
    ConfigModule,
    BackblazeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        endpoint: configService.getOrThrow<string>('B2_ENDPOINT'),
        bucket: configService.getOrThrow<string>('B2_BUCKET'),
        keyId: configService.getOrThrow<string>('B2_KEY_ID'),
        applicationKey: configService.getOrThrow<string>('B2_APPLICATION_KEY'),
        region: configService.get<string>('B2_REGION') ?? 'auto',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: StoredFile.name, schema: FileSchema }]),
    UsersModule,
    LabsModule,
    forwardRef(() => SessionsModule),
    AuthModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
