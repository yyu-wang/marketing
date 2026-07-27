import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

/**
 * 统一响应拦截器
 *
 * 作用：自动将 Controller 返回值包装为 PRD 9.2 节定义的统一响应结构。
 * 例外：
 *   - @Sse() 装饰的 SSE 流式接口不需被包装；
 *   - @RawResponse() 装饰的接口（如图片代理）不需要包装；
 *   - 已经是 ApiResponse 实例的返回值不重复包装。
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const handler = context.getHandler();
    const controller = context.getClass();

    if (Reflect.getMetadata('sse', handler)) {
      return next.handle() as Observable<ApiResponse<T> | T>;
    }

    if (
      this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
        handler,
        controller,
      ])
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data instanceof ApiResponse) return data;
        return ApiResponse.success(data);
      }),
    );
  }
}
