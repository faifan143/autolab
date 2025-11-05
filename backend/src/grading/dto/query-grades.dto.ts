import { IsMongoId, IsOptional } from 'class-validator';

export class QueryGradesDto {
  @IsOptional()
  @IsMongoId()
  labId?: string;
}
