import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}





