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
 *   - @Sse() 装饰的 SSE 流式接口不需被包装，通过检测 handler 元数据提前短路；
 *   - 已经是 ApiResponse 实例的返回值不重复包装。
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    // @Sse() 路由：直接透传，不做任何包装
    const isSse = Reflect.getMetadata('sse', context.getHandler());
    if (isSse) {
      return next.handle() as Observable<ApiResponse<T> | T>;
    }

    return next.handle().pipe(
      map((data) => {
        if (data instanceof ApiResponse) return data;
        return ApiResponse.success(data);
      }),
    );
  }
}
