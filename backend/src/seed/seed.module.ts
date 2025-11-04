import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LabsModule } from '../labs/labs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [ConfigModule, UsersModule, LabsModule, SessionsModule],
  providers: [SeedService],
})
export class SeedModule {}
