import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 全局守卫
 *
 * 对应 PRD 4.2.3：除注册/登录外，所有 API 需在请求头携带
 * Authorization: Bearer <token>。
 *
 * 工作流程：
 *   1. 若路由被 @Public() 标记 → 放行；
 *   2. 否则交给 passport-jwt 校验 token；
 *   3. 无效/过期 → 401，前端引导重新登录。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    if (err || !user) {
      throw new UnauthorizedException('无效或过期的登录凭证，请重新登录');
    }
    return user as TUser;
  }
}
