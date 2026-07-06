import { IsIP, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ScanStudentAttendanceDto {
  @IsString()
  @IsNotEmpty()
  studentToken: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
