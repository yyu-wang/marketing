import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const MAX_DAILY_QUOTA = 1000;

export class UpdateQuotaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DAILY_QUOTA)
  dailyQuota: number;
}
