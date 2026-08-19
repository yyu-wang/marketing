import { IsIn, IsOptional, IsString } from 'class-validator';

const CHANNELS = ['xiaohongshu', 'moments', 'ad_slogan'] as const;

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(CHANNELS, { message: '渠道必须为 xiaohongshu / moments / ad_slogan' })
  channel?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
