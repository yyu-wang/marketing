import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotaQueryDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20;
}
