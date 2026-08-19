/**
 * 统一响应结构 DTO
 *
 * 对应 PRD 9.2 节统一响应格式：
 * {
 *   "code": 200,
 *   "message": "success",
 *   "data": { ... }
 * }
 *
 * 所有成功接口都需通过 ApiResponseTransformer 拦截器包装为此结构。
 */
export class ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;

  constructor(code: number, message: string, data: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  /**
   * 快速构建成功响应
   * @param data 业务数据
   * @param message 提示文案，默认 "success"
   */
  static success<T>(data: T, message = 'success'): ApiResponse<T> {
    return new ApiResponse(200, message, data);
  }

  /**
   * 快速构建错误响应
   * @param code 业务错误码（与 HTTP 状态对齐）
   * @param message 错误提示
   * @param details 校验错误明细，对应 PRD 9.3 details 字段
   */
  static error(
    code: number,
    message: string,
    details?: string[],
  ): ApiResponse<unknown> {
    const resp = new ApiResponse(code, message, null);
    if (details) {
      // 兼容 PRD 9.3 错误响应中的 details 数组
      (resp as unknown as { details?: string[] }).details = details;
    }
    return resp;
  }
}
