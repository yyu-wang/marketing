import { Observable } from 'rxjs';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: ChatRole;
  /**
   * OpenAI 兼容格式：
   *   - 纯文本模型可用 string；
   *   - 视觉模型使用 [{type:'text'}, {type:'image_url'}]。
   */
  content: string | ChatContentPart[];
}

export interface GenerateStreamOptions {
  signal?: AbortSignal;
  /** 显式指定模型；未传时 Provider 根据是否含图自动选择 */
  model?: string;
}

/**
 * AI Provider 抽象接口
 *
 * 对应 PRD 7.4 可扩展性："AI 调用层独立成模块，可替换不同供应商"。
 * 当前默认实现：QwenProvider（通义千问）。
 *
 * V2：接口从纯 prompt 字符串升级为 Chat Completions messages，
 * 以支持通义千问视觉模型（图片 + 文本）。
 */
export interface AIProvider {
  /** Provider 名称（如 qwen / openai） */
  readonly name: string;

  /**
   * 流式生成
   *
   * @param messages OpenAI 兼容 chat messages
   * @param options 中止信号 / 指定模型
   * @returns Observable<string> —— 每个 next 为一段增量文本
   */
  generateStream(
    messages: ChatMessage[],
    options?: GenerateStreamOptions,
  ): Observable<string>;
}

/** Provider 注入 Token */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
