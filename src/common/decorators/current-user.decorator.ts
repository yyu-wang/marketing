import { ExecutionContext, createParamDecorator } from '@nestjs/common';

/**
 * CurrentUser 装饰器
 *
 * 用途：在 Controller 中快速取出 JWT 解出的当前登录用户。
 * 使用：
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 *
 * 数据来源：
 *   JwtStrategy.validate 的返回值会被 Passport 挂到 request.user。
 */
export interface JwtPayload {
  sub: number; // 用户 ID
  email: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
