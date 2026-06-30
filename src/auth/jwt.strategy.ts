import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../common/decorators/current-user.decorator';

/**
 * JWT 鉴权策略
 *
 * 对应 PRD 4.2.3 节：除注册/登录外所有接口需携带 Authorization: Bearer <token>。
 *
 * 工作流程：
 *   1. 从请求头提取 Bearer Token；
 *   2. 用 JWT_SECRET 校验签名与过期时间；
 *   3. 通过则将 validate 返回值挂到 request.user；
 *   4. 失败由 JwtAuthGuard 统一返回 401。
 *
 * 安全要点（PRD 7.2）：
 *   - JWT_SECRET 强制读取环境变量，禁止硬编码；
 *   - 默认 7 天过期（PRD 4.2.2）。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // 启动时即失败，避免运行期才发现配置缺失
      throw new Error('环境变量 JWT_SECRET 未配置，服务无法启动');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * 校验通过后回调；返回的对象挂到 request.user
   * 注：此处不再回查数据库以提升性能，敏感操作请在 Service 层再次校验归属。
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return { sub: Number(payload.sub), email: payload.email };
  }
}
