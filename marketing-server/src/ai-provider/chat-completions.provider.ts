import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subscriber } from 'rxjs';
import {
  AIProvider,
  ChatMessage,
  GenerateStreamOptions,
} from './ai-provider.interface';

const PLACEHOLDER_API_KEY = 'your_api_key_here';

/** 子类用于描述自身差异的静态配置 */
export interface ChatCompletionsConfig {
  /** Provider 名称，同时作为 AI_PROVIDER 的取值 */
  name: string;
  /** AI_BASE_URL 缺省值 */
  defaultBaseUrl: string;
  /** AI_MODEL 缺省值（文本模型） */
  defaultTextModel: string;
  /** AI_VISION_MODEL 缺省值；不传时回退文本模型 */
  defaultVisionModel?: string;
}

/**
 * OpenAI Chat Completions 协议兼容 Provider 基类
 *
 * 抽出通义千问 / DeepSeek 等兼容厂商共用的部分：
 *   - 环境变量读取、缺省值与占位 Key 告警；
 *   - 根据消息中是否含图自动选择文本 / 视觉模型；
 *   - SSE 流式解析（`data: {...}` + `data: [DONE]`）；
 *   - AbortSignal 透传，配合上层首字超时熔断。
 *
 * 子类只需覆写端点拼接 resolveEndpoint 与厂商特有请求参数 extraRequestBody。
 */
export abstract class ChatCompletionsProvider implements AIProvider {
  readonly name: string;
  protected readonly logger: Logger;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly textModel: string;
  private readonly visionModel: string;

  constructor(config: ConfigService, defaults: ChatCompletionsConfig) {
    this.name = defaults.name;
    this.logger = new Logger(`${defaults.name}Provider`);

    this.apiKey = config.get<string>('AI_API_KEY', '');
    this.baseUrl = config.get<string>('AI_BASE_URL', defaults.defaultBaseUrl);
    this.textModel = config.get<string>('AI_MODEL', defaults.defaultTextModel);
    this.visionModel = config.get<string>(
      'AI_VISION_MODEL',
      defaults.defaultVisionModel ?? this.textModel,
    );

    if (!this.apiKey || this.apiKey === PLACEHOLDER_API_KEY) {
      this.logger.error(
        'AI_API_KEY 未配置或仍为占位值，AI 生成功能将不可用。请检查 .env 文件中的 AI_API_KEY 是否正确设置。',
      );
    }
  }

  /** 将 AI_BASE_URL 拼接为 chat completions 完整端点 */
  protected abstract resolveEndpoint(baseUrl: string): string;

  /** 厂商特有的附加请求体字段（如 DeepSeek 的 thinking 开关） */
  protected extraRequestBody(): Record<string, unknown> {
    return {};
  }

  generateStream(
    messages: ChatMessage[],
    options?: GenerateStreamOptions,
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const controller = new AbortController();
      options?.signal?.addEventListener('abort', () => controller.abort());

      const hasImage = messages.some(
        (m) =>
          Array.isArray(m.content) &&
          m.content.some((part) => part.type === 'image_url'),
      );
      const model =
        options?.model ?? (hasImage ? this.visionModel : this.textModel);

      void this.consume(subscriber, { messages, model, controller });

      return () => controller.abort();
    });
  }

  /** 发起请求并把 SSE 增量推给订阅者（入参收敛为对象，避免超过 4 个） */
  private async consume(
    subscriber: Subscriber<string>,
    ctx: { messages: ChatMessage[]; model: string; controller: AbortController },
  ): Promise<void> {
    try {
      const resp = await fetch(this.resolveEndpoint(this.baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ctx.model,
          stream: true,
          messages: ctx.messages,
          ...this.extraRequestBody(),
        }),
        signal: ctx.controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '');
        throw new Error(`AI 服务异常: ${resp.status} ${text.slice(0, 200)}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { rest, finished } = this.pumpSse(buffer, subscriber);
        buffer = rest;
        if (finished) {
          subscriber.complete();
          return;
        }
      }

      subscriber.complete();
    } catch (err) {
      subscriber.error(err);
    }
  }

  /**
   * 解析缓冲区中已闭合的 SSE 事件，抽取 choices[0].delta.content 推送。
   *
   * @returns rest 未闭合的尾片段；finished 表示已收到 `[DONE]`
   */
  private pumpSse(
    buffer: string,
    subscriber: Subscriber<string>,
  ): { rest: string; finished: boolean } {
    const events = buffer.split('\n\n');
    const rest = events.pop() ?? '';

    for (const chunk of events) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;

      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return { rest, finished: true };

      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json?.choices?.[0]?.delta?.content;
        if (delta) subscriber.next(delta);
      } catch (e) {
        this.logger.warn(`SSE 解析失败: ${(e as Error).message}`);
      }
    }

    return { rest, finished: false };
  }
}
