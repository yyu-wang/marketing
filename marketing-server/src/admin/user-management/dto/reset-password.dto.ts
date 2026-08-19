import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  @IsNotEmpty({ message: '密码不能为空' })
  newPassword: string;
}
