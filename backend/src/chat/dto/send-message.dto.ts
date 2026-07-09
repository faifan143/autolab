import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  channel: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsMongoId()
  labId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  recipientIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  fileIds?: string[];
}






