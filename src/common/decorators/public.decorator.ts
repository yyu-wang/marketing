import { SetMetadata } from '@nestjs/common';

/**
 * Public 路由装饰器
 *
 * 用途：标记某接口免鉴权（如 /api/auth/register、/api/auth/login）。
 * 配合 JwtAuthGuard 使用：守卫在 canActivate 中读取该元数据，
 * 若存在则直接放行；否则强制要求合法 Bearer Token（PRD 4.2.3）。
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
