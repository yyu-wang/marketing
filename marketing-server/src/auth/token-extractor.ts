import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';

/**
 * JWT 提取器
 *
 * 提取顺序：
 *   1. Authorization: Bearer <token>（全路由生效，向后兼容）
 *   2. 若 1 缺失且请求路径命中 SSE 白名单 → 取 query.token
 *
 * 设计说明：
 *   浏览器原生 EventSource 无法设置 Authorization 请求头，
 *   故仅对 SSE 流式生成路由开放 ?token= 兜底，其余路由仍只认 Bearer Header，
 *   以控制 token 出现在 URL 中带来的日志/历史泄露风险。
 */
const SSE_PATHS = ['/api/ai/generate/stream', '/api/ai/chat/stream'];

export const jwtExtractor = (req: Request): string | null => {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  if (SSE_PATHS.includes(req.path) && typeof req.query?.token === 'string') {
    return req.query.token;
  }

  return null;
};
