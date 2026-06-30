import { Observable } from 'rxjs';

/**
 * AI Provider 抽象接口
 *
 * 对应 PRD 7.4 可扩展性："AI 调用层独立成模块，可替换不同供应商"。
 * 当前默认实现：QwenProvider（通义千问）。
 * 后续可新增：OpenAIProvider、ErnieProvider 等。
 */
export interface AIProvider {
  /** Provider 名称（如 qwen / openai） */
  readonly name: string;

  /**
   * 流式生成
   *
   * @param prompt 拼装好的最终 Prompt
   * @param signal 中止信号（用于超时熔断）
   * @returns Observable<string> —— 每个 next 为一段增量文本
   */
  generateStream(prompt: string, signal?: AbortSignal): Observable<string>;
}

/** Provider 注入 Token */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
