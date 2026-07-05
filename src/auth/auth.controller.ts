import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/**
 * 认证控制器
 *
 * 路由前缀：/api/auth
 * 全部接口标记为 @Public()，绕过全局 JwtAuthGuard。
 * 对应 PRD 9.1 节认证接口列表。
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * 注册：邮箱 + 密码 -> 返回 JWT
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '注册新用户',
    description:
      '邮箱 + 密码注册，密码经 bcrypt 哈希存储；注册成功直接返回 JWT（PRD 4.2.1）。',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * 登录：返回 JWT
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '邮箱密码登录',
    description:
      '返回 JWT；账户不存在或密码错误统一返回 401，避免用户存在性泄漏（PRD 4.2.2）。',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/auth/user/:id
   * 查询指定用户信息并打印到控制台
   */
  @Get('user/:id')
  getUserById(@Param('id') id: string) {
    return this.authService.findUserById(Number(id));
  }
}
