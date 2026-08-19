import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { Repository } from 'typeorm';
import { AI_PROVIDER, AIProvider } from '../ai-provider/ai-provider.interface';
import { ConversationsService } from '../conversations/conversations.service';
import { PromptTemplateEntity } from '../database/entities/prompt-template.entity';
import { buildChatPrompt, type BuildChatPromptInput } from '../prompts/chat-prompt';
import { QuotaService } from '../quota/quota.service';


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

  private readonly baseUrl: string;

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly conversations: ConversationsService,
    private readonly quotaService: QuotaService,
    @InjectRepository(PromptTemplateEntity)
    private readonly templateRepo: Repository<PromptTemplateEntity>,
    config: ConfigService,
  ) {
    this.aiTimeoutMs = config.get<number>('AI_TIMEOUT_MS', 15000);
    this.baseUrl = config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000');
  }

  /**
   * 流式生成（对话回复）
   */
  generateChat(
    userId: number,
    assistantMessageId: number,
    opts?: { continueFrom?: string; channel?: string; tone?: string; length?: string },
  ): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    void (async () => {
      try {
        // 0. 额度检查（continueFrom 场景不重复计费）
        if (!opts?.continueFrom) {
          const allowed = await this.quotaService.checkQuota(userId);
          if (!allowed) {
            subject.next({
              event: 'error',
              data: { message: '今日生成次数已用完，请明天再试' },
            });
            subject.complete();
            return;
          }
        }

        // 1. 加载上下文（含归属校验）
        const { user, assistant } = await this.conversations.loadAssistantContext(
          userId,
          assistantMessageId,
        );

        // 2. 构造 messages（含可选多图，渠道系统提示词优先取后台模板）
        const promptInput: BuildChatPromptInput = {
          text: user.content ?? '',
          imageUrls: user.imageUrls ?? undefined,
          preferDataUrl: true,
          continueFrom: opts?.continueFrom,
          channel: opts?.channel,
          tone: opts?.tone,
          length: opts?.length,
          channelSystemPrompt: opts?.channel
            ? await this.resolveChannelSystemPrompt(opts.channel)
            : undefined,
          baseUrl: this.baseUrl,
        };
        const messages = await buildChatPrompt(promptInput);

        await this.conversations.updateAssistantMessage(assistantMessageId, {
          status: 'streaming',
        });

        // 3. 调 Provider + 推 chunk + 累积
        const fullText = await this.consumeProvider(messages, subject);

        // 4. 保存旧版本（重生成场景）并持久化新内容
        if (assistant.content) {
          await this.conversations.saveMessageVersion(assistantMessageId, assistant.content);
        }

        await this.conversations.updateAssistantMessage(assistantMessageId, {
          content: fullText,
          status: 'done',
        });

        // 5. 记录额度（非 continueFrom 场景）
        if (!opts?.continueFrom) {
          try {
            await this.quotaService.recordUsage(userId);
          } catch (e) {
            this.logger.warn(`额度记录失败 userId=${userId}: ${(e as Error)?.message}`);
          }
        }

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

  /**
   * 解析渠道系统提示词：取 prompt_templates 中该渠道最近更新的模板；
   * 无模板时返回 undefined，由 buildSystemPrompt 回退内置渠道 prompt。
   */
  private async resolveChannelSystemPrompt(channel: string): Promise<string | undefined> {
    const template = await this.templateRepo.findOne({
      where: { channel },
      order: { updatedAt: 'DESC' },
    });
    return template?.content;
  }

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
