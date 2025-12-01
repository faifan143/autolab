import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLabArchiveDto {
  @IsBoolean()
  isArchived: boolean;
}

export class UpdateLabSuspensionDto {
  @IsBoolean()
  isSuspended: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspendReason?: string;
}






