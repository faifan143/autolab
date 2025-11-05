import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateGradeDto {
  @IsMongoId()
  studentId: string;

  @IsMongoId()
  labId: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  score: number;

  @IsOptional()
  @IsPositive()
  maxScore?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
