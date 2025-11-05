import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  recipientIds?: string[];

  @IsOptional()
  @IsMongoId()
  labId?: string;
}
