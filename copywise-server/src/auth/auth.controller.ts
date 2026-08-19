import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '注册新用户',
    description: '密码经 bcrypt 哈希存储；注册成功直接返回 JWT（PRD 4.2.1）。',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '邮箱密码登录',
    description: '账户不存在或密码错误统一返回 401，避免用户存在性泄漏（PRD 4.2.2）。',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Patch('profile')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '更新当前用户个人资料（昵称）' })
  updateProfile(@CurrentUser('sub') userId: number, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto.nickname);
  }

  @Get('user/:id')
  getUserById(@Param('id') id: string) {
    return this.authService.findUserById(Number(id));
  }
}
