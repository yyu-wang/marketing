import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const CHANNELS = ['xiaohongshu', 'moments', 'ad_slogan'] as const;

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty({ message: '模板名称不能为空' })
  name: string;

  @IsString()
  @IsIn(CHANNELS, { message: '渠道必须为 xiaohongshu / moments / ad_slogan' })
  @IsNotEmpty({ message: '渠道不能为空' })
  channel: string;

  @IsString()
  @IsNotEmpty({ message: '模板内容不能为空' })
  content: string;
}
