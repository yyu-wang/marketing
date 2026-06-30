import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CopyChannel } from '../../database/entities/copy.entity';

/**
 * 列表查询 DTO（query 参数）
 *
 * 对应 PRD 4.5.1：
 *   - 按渠道筛选（小红书/朋友圈/广告语/全部）；
 *   - 按生成时间倒序/正序排列。
 */
export class ListCopiesQueryDto {
  @ApiPropertyOptional({
    description: '渠道筛选',
    enum: CopyChannel,
    example: CopyChannel.XIAOHONGSHU,
  })
  @IsOptional()
  @IsEnum(CopyChannel)
  channel?: CopyChannel;

  @ApiPropertyOptional({
    description: '按生成时间排序，默认 desc',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc'; // 默认 desc
}

/**
 * 编辑文案 DTO
 *
 * 对应 PRD 4.5.2：字数限制 1000 字。
 */
export class UpdateCopyDto {
  @ApiProperty({
    description: '文案内容，最多 1000 字',
    maxLength: 1000,
    example: '清晨第一缕阳光，配一杯清透好洗发水。',
  })
  @IsString()
  @MinLength(1, { message: '文案内容不可为空' })
  @MaxLength(1000, { message: '文案字数不可超过 1000 字' })
  content: string;
}

/**
 * 收藏状态切换 DTO
 *
 * PATCH /api/copies/:id/star
 * 若不传 isStarred，则在原值上取反；传入则按指定值设置。
 */
export class ToggleStarDto {
  @ApiPropertyOptional({
    description: '目标收藏状态；不传则取反',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;
}

/**
 * 批量删除 DTO
 *
 * 对应 PRD 4.5.2：支持单条删除和批量删除。
 */
export class BatchDeleteDto {
  @ApiProperty({
    description: '待删除文案 ID 列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}
