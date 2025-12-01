import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class BulkUpdateUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  userIds: string[];

  @ValidateNested()
  @Type(() => UpdateUserDto)
  update: UpdateUserDto;
}
