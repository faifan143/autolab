import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartStreamDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  streamUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  streamKey?: string;
}





