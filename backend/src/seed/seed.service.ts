import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

interface SeedUserConfig {
  nameKey: string;
  emailKey: string;
  passwordKey: string;
  defaultName: string;
  role: UserRole;
}

const SEED_USERS: SeedUserConfig[] = [
  {
    nameKey: 'SEED_ADMIN_NAME',
    emailKey: 'SEED_ADMIN_EMAIL',
    passwordKey: 'SEED_ADMIN_PASSWORD',
    defaultName: 'Seed Admin',
    role: UserRole.Admin,
  },
  {
    nameKey: 'SEED_TEACHER_NAME',
    emailKey: 'SEED_TEACHER_EMAIL',
    passwordKey: 'SEED_TEACHER_PASSWORD',
    defaultName: 'Seed Teacher',
    role: UserRole.Teacher,
  },
  {
    nameKey: 'SEED_STUDENT_NAME',
    emailKey: 'SEED_STUDENT_EMAIL',
    passwordKey: 'SEED_STUDENT_PASSWORD',
    defaultName: 'Seed Student',
    role: UserRole.Student,
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminExists = await this.usersService.existsByRole(UserRole.Admin);
    if (adminExists) {
      this.logger.debug('Seed skipped: admin already present.');
      return;
    }

    this.logger.log('No admin detected. Running seed bootstrap...');

    for (const seedConfig of SEED_USERS) {
      await this.seedUser(seedConfig);
    }

    this.logger.log('Seed bootstrap completed.');
  }

  private async seedUser(config: SeedUserConfig): Promise<void> {
    const email = this.configService.get<string>(config.emailKey)?.toLowerCase();
    const password = this.configService.get<string>(config.passwordKey);
    const name =
      this.configService.get<string>(config.nameKey)?.trim() || config.defaultName;

    if (!email || !password) {
      this.logger.warn(
        `Skipping ${config.role} seed: missing ${config.emailKey} or ${config.passwordKey}.`,
      );
      return;
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      this.logger.debug(`Skipping ${config.role} seed: user with email ${email} already exists.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.usersService.create({
      name,
      email,
      passwordHash,
      role: config.role,
    });

    this.logger.log(`Seeded ${config.role} user (${email}).`);
  }
}
