import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @IsMongoId()
  labId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateThresholdMinutes?: number;
}
