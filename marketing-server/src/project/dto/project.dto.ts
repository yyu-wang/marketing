import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 创建项目 DTO
 *
 * 对应 PRD 4.3.1：
 *   - 项目名称必填，最多 50 字；
 *   - 产品描述必填，最多 500 字；
 *   - 目标人群可选，最多 200 字。
 */
export class CreateProjectDto {
  @ApiProperty({ description: '项目名称（用户范围内唯一）', maxLength: 50, example: '清透洗发水' })
  @IsString({ message: '项目名称必须为字符串' })
  @MinLength(1, { message: '请输入项目名称' })
  @MaxLength(50, { message: '项目名称不可超过 50 字' })
  name: string;

  @ApiProperty({
    description: '产品描述',
    maxLength: 500,
    example: '一款主打天然成分、控油保湿的洗发水',
  })
  @IsString({ message: '产品描述必须为字符串' })
  @MinLength(1, { message: '请输入产品描述' })
  @MaxLength(500, { message: '产品描述不可超过 500 字' })
  productDesc: string;

  @ApiPropertyOptional({
    description: '目标人群描述（可选）',
    maxLength: 200,
    example: '25-35 岁城市白领女性',
  })
  @IsOptional()
  @IsString({ message: '目标人群必须为字符串' })
  @MaxLength(200, { message: '目标人群不可超过 200 字' })
  targetAudience?: string;
}

/**
 * 更新项目 DTO（字段全部可选）
 *
 * 对应 PRD 4.3.3：仅项目创建者可修改。
 * 归属校验在 Service 层完成，DTO 层只关心格式。
 */
export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '项目名称不可超过 50 字' })
  name?: string;

  @ApiPropertyOptional({ description: '产品描述', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '产品描述不可超过 500 字' })
  productDesc?: string;

  @ApiPropertyOptional({ description: '目标人群描述', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '目标人群不可超过 200 字' })
  targetAudience?: string;
}
