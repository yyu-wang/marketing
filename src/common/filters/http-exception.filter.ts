import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

/**
 * 全局异常过滤器
 *
 * 作用：统一捕获所有未处理异常，按 PRD 9.3 节格式返回错误响应。
 * 处理逻辑：
 *   1. HttpException —— 使用其携带的 status 与 message；
 *   2. 其他异常 —— 兜底为 500，避免泄漏内部堆栈到前端；
 *   3. 类级校验错误（ValidationPipe）—— 返回 400 + details 字段。
 *
 * 安全：
 *   - 生产环境不向前端返回堆栈，仅记录到日志服务；
 *   - 不暴露用户存在性（如登录失败统一 401）。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 计算最终状态码与响应体
    let status: number;
    let apiResponse: ApiResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      apiResponse = this.transformHttpExceptionPayload(payload);
    } else {
      // 兜底：未识别的服务器异常
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      apiResponse = ApiResponse.error(
        status,
        '服务器内部错误，请稍后重试',
      );
      // 记录完整堆栈，便于排障
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(apiResponse);
  }

  /**
   * 将 NestJS 内置异常 payload 转换为 PRD 9.3 格式
   * - ValidationPipe 抛出的 BadRequestException 形如
   *   { message: string[], error: 'Bad Request' }，需转为 details 数组；
   * - 业务异常形如 { message: '...', code?: 123 }，直接透传。
   */
  private transformHttpExceptionPayload(payload: unknown): ApiResponse {
    if (typeof payload === 'string') {
      return ApiResponse.error(400, payload);
    }

    if (payload && typeof payload === 'object') {
      const obj = payload as {
        message?: string | string[];
        error?: string;
        details?: string[];
      };

      // 类级校验错误：message 为数组
      if (Array.isArray(obj.message) && obj.message.length > 0) {
        return ApiResponse.error(400, '请求参数错误', obj.message);
      }

      // 业务自定义错误
      const message =
        (typeof obj.message === 'string' && obj.message) ||
        obj.error ||
        '请求异常';
      return ApiResponse.error(
        400,
        message,
        Array.isArray(obj.details) ? obj.details : undefined,
      );
    }

    return ApiResponse.error(400, '请求异常');
  }
}
