import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ required: false, description: '标题（可选，未传时为「新对话」）' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;
}

export class RenameConversationDto {
  @ApiProperty({ description: '新标题' })
  @IsString()
  @MaxLength(60)
  title: string;
}

export class PostMessageDto {
  @ApiProperty({ required: false, description: '用户输入文本' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @ApiProperty({ required: false, description: '已上传图片 URL 数组，最多 9 张' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
