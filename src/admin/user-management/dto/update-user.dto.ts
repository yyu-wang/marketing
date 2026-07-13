import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'isActive 必须为 0 或 1' })
  isActive?: number;
}
