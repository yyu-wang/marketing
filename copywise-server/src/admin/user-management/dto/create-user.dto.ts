import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '昵称长度不可超过 20 字符' })
  nickname?: string;

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}
