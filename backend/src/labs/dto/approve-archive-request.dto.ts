import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveArchiveRequestDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}





