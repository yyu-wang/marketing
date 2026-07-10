import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import {
  AIProvider,
  ChatMessage,
  GenerateStreamOptions,
} from './ai-provider.interface';

/**
 * 通义千问 Provider（V2：多模态）
 *
 * 通过 DashScope OpenAI 兼容接口实现 SSE 流式生成。
 * 文档：https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 *
 * 关键设计：
 *   - 直接以 fetch + ReadableStream 解析 SSE，避免引入额外依赖；
 *   - AbortSignal 支持上游超时熔断；
 *   - 解析 "data: {...}" 行 -> 抽取 delta.content；
 *   - 自动判定模型：当任一 message 含 image_url → 切到 vision 模型
 *     （默认 qwen-vl-max-latest），否则用文本模型（默认 qwen-turbo）。
 */
@Injectable()
export class QwenProvider implements AIProvider {
  readonly name = 'qwen';
  private readonly logger = new Logger(QwenProvider.name);

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly textModel: string;
  private readonly visionModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('AI_API_KEY', '');
    this.baseUrl = config.get<string>(
      'AI_BASE_URL',
      'https://dashscope.aliyuncs.com',
    );
    this.textModel = config.get<string>('AI_MODEL', 'qwen-turbo');
    this.visionModel = config.get<string>(
      'AI_VISION_MODEL',
      this.textModel,
    );

    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      this.logger.error(
        'AI_API_KEY 未配置或仍为占位值，AI 生成功能将不可用。请检查 .env 文件中的 AI_API_KEY 是否正确设置。',
      );
    }
  }

  generateStream(
    messages: ChatMessage[],
    options?: GenerateStreamOptions,
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const controller = new AbortController();
      const signal = options?.signal;
      signal?.addEventListener('abort', () => controller.abort());

      const hasImage = messages.some(
        (m) =>
          Array.isArray(m.content) &&
          m.content.some((part) => part.type === 'image_url'),
      );
      const model =
        options?.model ?? (hasImage ? this.visionModel : this.textModel);

      (async () => {
        try {
          const endpoint = this.buildEndpoint();
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              stream: true,
              messages,
            }),
            signal: controller.signal,
          });

          if (!resp.ok || !resp.body) {
            const text = await resp.text().catch(() => '');
            throw new Error(
              `AI 服务异常: ${resp.status} ${text.slice(0, 200)}`,
            );
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const chunk of events) {
              const line = chunk.trim();
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') {
                subscriber.complete();
                return;
              }
              try {
                const json = JSON.parse(payload);
                const delta: string | undefined =
                  json?.choices?.[0]?.delta?.content;
                if (delta) subscriber.next(delta);
              } catch (e) {
                this.logger.warn(`SSE 解析失败: ${(e as Error).message}`);
              }
            }
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();

      return () => controller.abort();
    });
  }

  /**
   * 兼容多种 AI_BASE_URL 配置：
   *   - 完整 endpoint（已带 /chat/completions）：直接用
   *   - 已带 /v1 或 /compatible-mode/v1：补 /chat/completions
   *   - 仅域名：补 /compatible-mode/v1/chat/completions
   */
  private buildEndpoint(): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    if (/\/chat\/completions$/.test(base)) return base;
    if (/\/v1$/.test(base)) return `${base}/chat/completions`;
    return `${base}/compatible-mode/v1/chat/completions`;
  }
}
