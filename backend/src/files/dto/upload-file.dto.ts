import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsMongoId()
  labId?: string;

  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
