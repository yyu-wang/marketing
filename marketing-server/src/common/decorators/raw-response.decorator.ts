import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * 标记路由不需要通过 ResponseTransformInterceptor 包装为统一响应格式。
 * 适用于直接返回二进制数据（图片等）的端点。
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
