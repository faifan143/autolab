import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum GlobalSearchType {
  Labs = 'labs',
  Users = 'users',
  Sessions = 'sessions',
  Files = 'files',
}

export class GlobalSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Array.isArray(value)
        ? value
        : [value],
  )
  @IsArray()
  @IsEnum(GlobalSearchType, { each: true })
  types?: GlobalSearchType[];
}


