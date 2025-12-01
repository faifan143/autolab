import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class QueryMessagesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  channel: string;

  @IsOptional()
  @IsMongoId()
  labId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  offset?: number;
}






