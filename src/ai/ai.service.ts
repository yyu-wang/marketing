import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { AI_PROVIDER, AIProvider } from '../ai-provider/ai-provider.interface';
import { ConversationsService } from '../conversations/conversations.service';
import { buildChatPrompt } from '../prompts/chat-prompt';


/**
 * SSE 事件类型（V2 chat 模式）
 *
 * 前端 EventSource 按 event 字段分类处理：
 *   - chunk: 流式增量片段（"打字机"效果）
 *   - done:  本次生成结束
 *   - error: 异常提示（前端引导重试）
 */
export type SseEvent =
  | { event: 'chunk'; data: { delta: string } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } };

/**
 * AI 对话生成服务（V2 chat 模式）
 *
 * 输入：assistantMessageId（已落库的占位 assistant 消息）
 * 流程：
 *   1. 加载 assistant + 同对话最近一条 user 消息（带归属校验）；
 *   2. 构造多模态 messages（含可选 image data URL）；
 *   3. 调用 Provider → 累积 + 推 chunk；
 *   4. 持久化回复内容到 message 行 → 推 done；
 *   5. 失败 → error。
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiTimeoutMs: number;

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly conversations: ConversationsService,
    config: ConfigService,
  ) {
    this.aiTimeoutMs = config.get<number>('AI_TIMEOUT_MS', 15000);
  }

  /**
   * 流式生成（对话回复）
   */
  generateChat(userId: number, assistantMessageId: number): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    void (async () => {
      try {
        // 1. 加载上下文（含归属校验）
        const { user, assistant } = await this.conversations.loadAssistantContext(
          userId,
          assistantMessageId,
        );

        // 2. 构造 messages（含可选多图）
        const messages = await buildChatPrompt({
          text: user.content ?? '',
          imageUrls: user.imageUrls ?? undefined,
          preferDataUrl: true,
        });

        await this.conversations.updateAssistantMessage(assistantMessageId, {
          status: 'streaming',
        });

        // 3. 调 Provider + 推 chunk + 累积
        const fullText = await this.consumeProvider(messages, subject);

        // 4. 持久化回复内容
        await this.conversations.updateAssistantMessage(assistantMessageId, {
          content: fullText,
          status: 'done',
        });

        subject.next({ event: 'done', data: {} });
        subject.complete();
      } catch (err) {
        this.logger.error(
          `AI 生成异常 userId=${userId}: ${(err as Error)?.message ?? err}`,
        );
        try {
          await this.conversations.updateAssistantMessage(assistantMessageId, {
            status: 'error',
          });
        } catch {
          /* ignore */
        }
        subject.next({
          event: 'error',
          data: {
            message:
              (err as Error)?.message ?? 'AI 服务暂时不可用，请稍后重试',
          },
        });
        subject.complete();
      }
    })();

    return subject.asObservable();
  }

  // -------------------------------------------------------------------
  // 内部
  // -------------------------------------------------------------------

  private consumeProvider(
    messages: Parameters<AIProvider['generateStream']>[0],
    subject: Subject<SseEvent>,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let fullText = '';
      const abortController = new AbortController();

      const timer = setTimeout(() => {
        abortController.abort();
        reject(new ServiceUnavailableException('AI 服务响应超时，请稍后重试'));
      }, this.aiTimeoutMs);

      this.provider
        .generateStream(messages, { signal: abortController.signal })
        .subscribe({
          next: (delta) => {
            if (!fullText) clearTimeout(timer);
            fullText += delta;
            subject.next({ event: 'chunk', data: { delta } });
          },
          error: (err) => {
            clearTimeout(timer);
            reject(err);
          },
          complete: () => {
            clearTimeout(timer);
            resolve(fullText);
          },
        });
    });
  }
}
