import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HealthController } from './health.controller';
import { LabsModule } from './labs/labs.module';
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
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
