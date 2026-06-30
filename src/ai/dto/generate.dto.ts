import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CopyChannel } from '../../database/entities/copy.entity';

/**
 * 生成请求 DTO
 *
 * GET /api/ai/generate/stream 支持作为 query 传参（便于 EventSource 使用）。
 * POST /api/ai/generate（非流式备用）使用同一 DTO。
 */
export class GenerateDto {
  /** 项目 ID（业务层校验归属） */
  @ApiProperty({ description: '项目 ID', example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'projectId 必须为整数' })
  @Min(1)
  projectId: number;

  /** 渠道 */
  @ApiProperty({
    description: '生成渠道',
    enum: CopyChannel,
    example: CopyChannel.XIAOHONGSHU,
  })
  @IsEnum(CopyChannel, {
    message: 'channel 仅支持 xiaohongshu / moments / ad_slogan',
  })
  channel: CopyChannel;
}
