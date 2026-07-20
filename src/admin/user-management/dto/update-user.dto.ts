import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '昵称长度不可超过 20 字符' })
  nickname?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'isActive 必须为 0 或 1' })
  isActive?: number;
}
