import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { AIProvider } from './ai-provider.interface';

/**
 * 通义千问 Provider
 *
 * 通过 DashScope OpenAI 兼容接口实现 SSE 流式生成。
 * 文档：https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 *
 * 关键设计：
 *   - 直接以 fetch + ReadableStream 解析 SSE，避免引入额外依赖；
 *   - AbortSignal 支持上游超时熔断（PRD 5.4：>10s 提示失败）；
 *   - 解析 "data: {...}" 行 -> 抽取 delta.content。
 */
@Injectable()
export class QwenProvider implements AIProvider {
  readonly name = 'qwen';
  private readonly logger = new Logger(QwenProvider.name);

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('AI_API_KEY', '');
    this.baseUrl = config.get<string>(
      'AI_BASE_URL',
      'https://dashscope.aliyuncs.com',
    );
    this.model = config.get<string>('AI_MODEL', 'qwen-turbo');
  }

  generateStream(prompt: string, signal?: AbortSignal): Observable<string> {
    return new Observable<string>((subscriber) => {
      const controller = new AbortController();
      // 上游 signal 触发时同步中止本次请求
      signal?.addEventListener('abort', () => controller.abort());

      (async () => {
        try {
          const resp = await fetch(
            `${this.baseUrl}/compatible-mode/v1/chat/completions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: this.model,
                stream: true,
                messages: [
                  { role: 'system', content: '你是一位资深中文营销文案撰写专家。' },
                  { role: 'user', content: prompt },
                ],
              }),
              signal: controller.signal,
            },
          );

          if (!resp.ok || !resp.body) {
            const text = await resp.text().catch(() => '');
            throw new Error(`AI 服务异常: ${resp.status} ${text.slice(0, 200)}`);
          }

          // 逐块解析 SSE
          const reader = resp.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE 以双换行分隔事件
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const evt of events) {
              const line = evt.trim();
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
                // 单条解析失败不影响整体；记录后继续
                this.logger.warn(`SSE 解析失败: ${(e as Error).message}`);
              }
            }
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // 上游取消订阅时主动 abort
      return () => controller.abort();
    });
  }
}
