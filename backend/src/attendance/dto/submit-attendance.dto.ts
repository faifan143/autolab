import { IsIP, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitAttendanceDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
