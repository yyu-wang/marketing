import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { AI_PROVIDER, AIProvider } from '../ai-provider/ai-provider.interface';
import { ConversationsService } from '../conversations/conversations.service';
import { buildChatPrompt, parseDualOutput } from '../prompts/chat-prompt';
import { QuotaService } from '../quota/quota.service';
import { SensitiveWordFilter } from './sensitive-word.filter';

/**
 * SSE 事件类型（V2 chat 模式）
 *
 * 前端 EventSource 按 event 字段分类处理：
 *   - chunk:  累积式增量片段（"打字机"效果，前端可选择展示原始片段）
 *   - result: 结构化两版文案 { xiaohongshu, moments, messageId }
 *   - done:   本次生成结束，附带剩余额度
 *   - error:  异常提示（前端引导重试）
 */
export type SseEvent =
  | { event: 'chunk'; data: { delta: string } }
  | {
      event: 'result';
      data: {
        messageId: number;
        xiaohongshu: string;
        moments: string;
      };
    }
  | { event: 'done'; data: { remaining: number; max: number } }
  | { event: 'error'; data: { message: string } };

/**
 * AI 双版文案生成服务（V2 chat 模式）
 *
 * 输入：assistantMessageId（已落库的占位 assistant 消息）
 * 流程：
 *   1. 加载 assistant + 同对话最近一条 user 消息（带归属校验）；
 *   2. 预扣额度（Redis Lua）；
 *   3. 构造多模态 messages（含可选 image data URL）；
 *   4. 调用 Provider → 累积 + 推 chunk；
 *   5. 全文敏感词检查；
 *   6. parseDualOutput → 持久化两版文案到 message 行 → 推 result + done；
 *   7. 失败 → refund + error。
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiTimeoutMs: number;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly quotaService: QuotaService,
    private readonly conversations: ConversationsService,
    private readonly sensitiveFilter: SensitiveWordFilter,
    config: ConfigService,
  ) {
    this.aiTimeoutMs = config.get<number>('AI_TIMEOUT_MS', 15000);
    this.publicBaseUrl = config.get<string>(
      'PUBLIC_BASE_URL',
      'http://localhost:3000',
    );
  }

  /**
   * 流式生成（双版文案）
   */
  generateChat(userId: number, assistantMessageId: number): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    void (async () => {
      let quotaConsumed = false;

      try {
        // 1. 加载上下文（含归属校验）
        const { user, assistant } = await this.conversations.loadAssistantContext(
          userId,
          assistantMessageId,
        );

        // 2. 额度预扣
        quotaConsumed = await this.quotaService.consume(userId);
        if (!quotaConsumed) {
          throw new BadRequestException('今日免费额度已用完，请明日再来');
        }

        // 3. 构造 messages（含可选 data URL 图片）
        const messages = await buildChatPrompt({
          text: user.content ?? '',
          imageUrl: user.imageUrl ?? undefined,
          publicBaseUrl: this.publicBaseUrl,
          preferDataUrl: true,
        });

        await this.conversations.updateAssistantMessage(assistantMessageId, {
          status: 'streaming',
        });

        // 4. 调 Provider + 推 chunk + 累积
        const fullText = await this.consumeProvider(messages, subject);

        // 5. 敏感词
        if (this.sensitiveFilter.contains(fullText)) {
          this.logger.warn(
            `敏感词命中 userId=${userId} assistantMessageId=${assistantMessageId} word=${this.sensitiveFilter.firstMatch(fullText)}`,
          );
          await this.refundIfNeeded(userId, quotaConsumed);
          quotaConsumed = false;
          await this.conversations.updateAssistantMessage(assistantMessageId, {
            content: fullText,
            status: 'error',
          });
          subject.next({
            event: 'error',
            data: { message: '生成内容包含敏感信息，已拒绝保存' },
          });
          subject.complete();
          return;
        }

        // 6. 解析双版文案
        const { xiaohongshu, moments } = parseDualOutput(fullText);
        if (!xiaohongshu && !moments) {
          await this.refundIfNeeded(userId, quotaConsumed);
          quotaConsumed = false;
          await this.conversations.updateAssistantMessage(assistantMessageId, {
            content: fullText,
            status: 'error',
          });
          subject.next({
            event: 'error',
            data: { message: '生成内容格式异常，请重新生成' },
          });
          subject.complete();
          return;
        }

        await this.conversations.updateAssistantMessage(assistantMessageId, {
          content: fullText,
          xiaohongshu,
          moments,
          status: 'done',
        });

        subject.next({
          event: 'result',
          data: {
            messageId: Number(assistant.id),
            xiaohongshu,
            moments,
          },
        });

        const { remaining, max } = await this.quotaService.getTodayRemaining(
          userId,
        );
        subject.next({ event: 'done', data: { remaining, max } });
        subject.complete();
      } catch (err) {
        this.logger.error(
          `AI 生成异常 userId=${userId}: ${(err as Error)?.message ?? err}`,
        );
        await this.refundIfNeeded(userId, quotaConsumed);
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

  private async refundIfNeeded(
    userId: number,
    consumed: boolean,
  ): Promise<void> {
    if (!consumed) return;
    try {
      await this.quotaService.refund(userId);
    } catch (err) {
      this.logger.error(
        `回滚额度失败 userId=${userId}: ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
