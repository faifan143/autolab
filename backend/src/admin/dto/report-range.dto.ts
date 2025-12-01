import { IsISO8601, IsMongoId, IsOptional } from 'class-validator';

export class ReportRangeDto {
  @IsOptional()
  @IsMongoId()
  labId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}






