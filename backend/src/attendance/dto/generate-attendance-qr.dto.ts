import { IsOptional, IsPositive } from 'class-validator';

export class GenerateAttendanceQrDto {
  @IsOptional()
  @IsPositive()
  expiresInMinutes?: number;
}
