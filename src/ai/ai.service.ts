import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { CopyEntity, CopyChannel } from '../database/entities/copy.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { AI_PROVIDER, AIProvider } from '../ai-provider/ai-provider.interface';
import { buildPrompt } from '../prompts/channel-prompts';
import { QuotaService } from '../quota/quota.service';
import { SensitiveWordFilter } from './sensitive-word.filter';

/**
 * SSE 事件类型
 *
 * 前端 EventSource 按 event 字段分类处理：
 *   - chunk:  追加文案片段（用于"逐字展示"，PRD 4.4.1）
 *   - copy:   单条文案入库完成（含 id）
 *   - done:   本次生成结束，附带剩余额度供前端更新顶部展示
 *   - error:  异常提示（前端引导重试）
 *
 * 注：NestJS @Sse 装饰器要求事件结构包含 { data, type? }，
 * 此处将语义化字段 event/data 转为 NestJS 的 { type, data } 在 Controller 完成。
 */
export type SseEvent =
  | { event: 'chunk'; data: { delta: string } }
  | {
      event: 'copy';
      data: { copyId: number; content: string; channel: CopyChannel };
    }
  | { event: 'done'; data: { remaining: number; max: number } }
  | { event: 'error'; data: { message: string } };

/**
 * AI 文案生成服务
 *
 * 对应 PRD 4.4 AI 文案生成模块。核心流程：
 *   1. 校验项目归属；
 *   2. 提前扣减额度（Redis Lua 原子操作，避免并发超卖）；
 *   3. 拼装 Prompt 并调用 Provider；
 *   4. 流式推送 chunk 给前端；
 *   5. 流完成后解析 + 入库 + 推送 copy / done；
 *   6. 任何失败回滚额度并推送 error。
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiTimeoutMs: number;

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(CopyEntity)
    private readonly copyRepo: Repository<CopyEntity>,
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly quotaService: QuotaService,
    private readonly sensitiveFilter: SensitiveWordFilter,
    config: ConfigService,
  ) {
    this.aiTimeoutMs = config.get<number>('AI_TIMEOUT_MS', 10000);
  }

  /**
   * 流式生成
   *
   * 使用 Subject 作为事件总线：
   *   - 上游：Provider 持续 next chunk；
   *   - 下游：Controller 订阅并转为 SSE 输出。
   * 这样可以在流结束后再插入 copy / done 事件，无需复杂 RxJS 算子组合。
   */
  generateStream(
    userId: number,
    projectId: number,
    channel: CopyChannel,
  ): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    // 异步立即执行，避免阻塞 Subject 返回
    void (async () => {
      let quotaConsumed = false;
      let timer: NodeJS.Timeout | null = null;

      try {
        // 1. 校验项目归属
        const project = await this.projectRepo.findOne({
          where: { id: projectId },
        });
        if (!project) throw new BadRequestException('项目不存在');
        // JWT 中 userId 为字符串，entity 中为 number，统一转 Number 再比较
        if (Number(project.userId) !== Number(userId)) {
          throw new BadRequestException('无权操作该项目');
        }

        // 2. 额度预扣（不足 → 立即失败，无需调用 AI）
        quotaConsumed = await this.quotaService.consume(userId);
        if (!quotaConsumed) {
          throw new BadRequestException('今日免费额度已用完，请明日再来');
        }

        // 3. 拼装 Prompt
        const prompt = buildPrompt(channel, {
          productName: project.name,
          productDesc: project.productDesc,
          targetAudience: project.targetAudience,
        });

        // 4. 调用 Provider，累积全文 + 推送 chunk
        const fullText = await this.consumeProvider(prompt, subject);

        // 5. 敏感词校验（PRD 5.4）
        if (this.sensitiveFilter.contains(fullText)) {
          this.logger.warn(
            `敏感词命中 userId=${userId} projectId=${projectId} word=${this.sensitiveFilter.firstMatch(fullText)}`,
          );
          await this.refundIfNeeded(userId, quotaConsumed);
          quotaConsumed = false;
          subject.next({
            event: 'error',
            data: { message: '生成内容包含敏感信息，已拒绝保存' },
          });
          subject.complete();
          return;
        }

        // 6. 解析多条文案
        const contents = this.parseCopies(fullText);
        if (contents.length === 0) {
          await this.refundIfNeeded(userId, quotaConsumed);
          quotaConsumed = false;
          subject.next({
            event: 'error',
            data: { message: '生成内容格式异常，请重新生成' },
          });
          subject.complete();
          return;
        }

        // 7. 批量入库 + 推送 copy 事件
        for (const content of contents) {
          const saved = await this.copyRepo.save(
            this.copyRepo.create({ projectId, channel, content }),
          );
          subject.next({
            event: 'copy',
            data: {
              copyId: Number(saved.id),
              content: saved.content,
              channel: saved.channel,
            },
          });
        }

        // 8. 推送 done（含最新剩余额度）
        const { remaining, max } = await this.quotaService.getTodayRemaining(
          userId,
        );
        subject.next({ event: 'done', data: { remaining, max } });
        subject.complete();
      } catch (err) {
        this.logger.error(
          `AI 生成异常 userId=${userId}: ${(err as Error)?.message ?? err}`,
        );
        // 任何已扣减额度的失败 → 回滚（PRD 4.4.3：生成失败不扣额度）
        await this.refundIfNeeded(userId, quotaConsumed);
        subject.next({
          event: 'error',
          data: {
            message:
              (err as Error)?.message ?? 'AI 服务暂时不可用，请稍后重试',
          },
        });
        subject.complete();
      } finally {
        if (timer) clearTimeout(timer);
      }
    })();

    return subject.asObservable();
  }

  // -------------------------------------------------------------------
  // 内部工具
  // -------------------------------------------------------------------

  /**
   * 订阅 Provider 流：累积全文 + 同步推送 chunk 给下游 Subject
   *
   * 超时熔断：
   *   - 整体 aiTimeoutMs 内若 Provider 没有任何输出 → 抛 ServiceUnavailableException；
   *   - 对应 PRD 5.4：AI 超时（>10s 无响应）前端提示生成失败，不扣额度。
   */
  private consumeProvider(
    prompt: string,
    subject: Subject<SseEvent>,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let fullText = '';
      const abortController = new AbortController();

      // 首字延迟兜底定时器
      const timer = setTimeout(() => {
        abortController.abort();
        reject(new ServiceUnavailableException('AI 服务响应超时，请稍后重试'));
      }, this.aiTimeoutMs);

      // 注意：subscribe 对同步 Observable（如测试中的 of(...)）会立即触发
      // next/complete，此时局部变量 sub 尚未赋值。
      // 因此使用 Subscription 包装容器，避免在回调中访问未初始化的 const。
      // 同时：complete/error 已经终止订阅，框架会自动 teardown，无需手动 unsubscribe。
      this.provider
        .generateStream(prompt, abortController.signal)
        .subscribe({
          next: (delta) => {
            if (!fullText) {
              // 首字到达后取消首字超时
              clearTimeout(timer);
            }
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

  /**
   * 回滚额度（仅当本次确实扣减成功时）
   */
  private async refundIfNeeded(
    userId: number,
    consumed: boolean,
  ): Promise<void> {
    if (!consumed) return;
    try {
      await this.quotaService.refund(userId);
    } catch (err) {
      // 回滚失败仅记录日志，由对账任务兜底
      this.logger.error(
        `回滚额度失败 userId=${userId}: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  /**
   * 将模型输出解析为多条文案
   *
   * 优先尝试 JSON.parse；失败则按编号 / 段落兜底切分。
   * PRD 4.4.2 要求每渠道返回 3 条；实际以解析结果为准，调用方不强校验数量。
   */
  private parseCopies(raw: string): string[] {
    const text = (raw || '').trim();
    // 兼容模型偶发的 ```json ... ``` 包裹
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    // 1. JSON 数组
    try {
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) {
        return arr.map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      // 解析失败 → 兜底
    }

    // 2. 兜底：按 "1." / "2." / 双换行 切分
    const segments = cleaned
      .split(/\n\s*(?:\d+[.)、])\s*|\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    return segments;
  }
}
