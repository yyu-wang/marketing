import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

/**
 * 统一响应拦截器
 *
 * 作用：自动将 Controller 返回值包装为 PRD 9.2 节定义的统一响应结构。
 * 例外：
 *   - SSE 流式接口不应被包装（生成接口 GET /api/ai/generate/stream），
 *     在 Controller 上使用 @Sse 装饰器即可绕过；
 *   - 已经是 ApiResponse 实例的返回值不重复包装。
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // 已是统一响应 → 不重复包装
        if (data instanceof ApiResponse) return data;
        // 流（如 SSE）→ 直接透传
        if (
          data &&
          typeof (data as unknown as { subscribe?: unknown }).subscribe ===
            'function'
        ) {
          return data;
        }
        return ApiResponse.success(data);
      }),
    );
  }
}
