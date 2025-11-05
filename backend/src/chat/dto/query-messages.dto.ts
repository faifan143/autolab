import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class QueryMessagesDto {
  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsOptional()
  @IsMongoId()
  afterId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  limit?: number;
}

