import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class BulkDeleteUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  userIds: string[];
}
