import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [SeedService],
})
export class SeedModule {}
