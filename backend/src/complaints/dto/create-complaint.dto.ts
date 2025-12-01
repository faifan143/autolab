import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsMongoId()
  labId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}






