import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * 请求日志拦截器
 *
 * 作用：记录每个请求的耗时与异常，便于线上排障。
 * 日志格式（结构化）：
 *   [method] [path] -> [status] [耗时ms]
 * 注意：敏感参数（password、token）应在传入前由 DTO 脱敏，此处只记录元信息。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, path } = req;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${path} -> ${Date.now() - startedAt}ms`);
        },
        error: (err) => {
          // 异常情况统一交由 HttpExceptionFilter 处理，这里只记录耗时
          this.logger.warn(
            `${method} ${path} -> error in ${Date.now() - startedAt}ms: ${err.message}`,
          );
        },
      }),
    );
  }
}
