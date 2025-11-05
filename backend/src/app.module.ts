import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FilesModule } from './files/files.module';
import { GradingModule } from './grading/grading.module';
import { HealthController } from './health.controller';
import { LabsModule } from './labs/labs.module';
import { FirebaseNotificationsModule } from './integrations/firebase/firebase-notifications.module';
import { SeedModule } from './seed/seed.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    SeedModule,
    AuthModule,
    LabsModule,
    SessionsModule,
    AttendanceModule,
    GradingModule,
    FirebaseNotificationsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        credential: {
          projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: configService.getOrThrow<string>('FIREBASE_PRIVATE_KEY'),
        },
        defaultTtlSeconds: configService.get<number>('FIREBASE_DEFAULT_TTL') ?? 3600,
      }),
      inject: [ConfigService],
    }),
    FilesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

