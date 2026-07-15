import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * 注册请求 DTO
 *
 * 对应 PRD 4.2.1 规则约束：
 *   - 邮箱符合 RFC 5322；
 *   - 密码长度 >= 8 位，必须同时包含英文字母和阿拉伯数字。
 */
export class RegisterDto {
  @ApiPropertyOptional({
    description: '密码哈希版本：0=明文（旧客户端），1=SHA-256（新客户端）',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'hashVersion 必须为整数' })
  @Min(0, { message: 'hashVersion 不可为负数' })
  hashVersion?: number;

  @ApiProperty({
    description: '注册邮箱，全局唯一',
    example: 'user@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱长度不可超过 255 字符' })
  email: string;

  @ApiProperty({
    description: '密码：8-64 位，必须同时包含英文字母和数字（hashVersion≥1 时跳过复杂度校验，由前端校验）',
    example: 'abc12345',
    minLength: 8,
    maxLength: 64,
  })
  @IsString({ message: '密码必须为字符串' })
  @MinLength(8, { message: '密码长度至少 8 位' })
  @MaxLength(64, { message: '密码长度不可超过 64 位' })
  @ValidateIf((o) => !o.hashVersion || o.hashVersion < 1)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: '密码必须同时包含英文字母和阿拉伯数字',
  })
  password: string;
}

/**
 * 登录请求 DTO
 *
 * 对应 PRD 4.2.2：邮箱 + 密码登录。
 * 注：此处仅做基本格式校验；具体凭证错误返回 401，且不区分"账户不存在"
 * 与"密码错误"以防止用户存在性泄漏（4.2.2 异常处理）。
 */
export class LoginDto {
  @ApiPropertyOptional({
    description: '密码哈希版本：0=明文（旧客户端），1=SHA-256（新客户端）',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'hashVersion 必须为整数' })
  @Min(0, { message: 'hashVersion 不可为负数' })
  hashVersion?: number;

  @ApiProperty({
    description: '登录邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '登录密码（hashVersion=0 时为明文，hashVersion=1 时为 SHA-256 哈希）',
    example: 'abc12345',
  })
  @IsString({ message: '密码必须为字符串' })
  @MinLength(1, { message: '请输入密码' })
  password: string;
}
