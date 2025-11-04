import { IsArray, IsMongoId } from 'class-validator';

export class UpdateLabStudentsDto {
  @IsArray()
  @IsMongoId({ each: true })
  studentIds: string[];
}
