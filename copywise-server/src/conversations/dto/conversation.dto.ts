import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
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

export class EditMessageDto {
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MaxLength(2000)
  content: string;
}

const MESSAGE_PAGE_SIZE_DEFAULT = 50;
const MESSAGE_PAGE_SIZE_MAX = 200;

export class PaginationQueryDto {
  @ApiProperty({ required: false, default: 1, description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: MESSAGE_PAGE_SIZE_DEFAULT, description: '每页条数' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MESSAGE_PAGE_SIZE_MAX)
  pageSize?: number = MESSAGE_PAGE_SIZE_DEFAULT;
}
