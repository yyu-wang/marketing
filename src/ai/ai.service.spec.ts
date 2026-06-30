import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Observable, of, throwError } from 'rxjs';
import { AI_PROVIDER, AIProvider } from '../ai-provider/ai-provider.interface';
import { CopyChannel, CopyEntity } from '../database/entities/copy.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { QuotaService } from '../quota/quota.service';
import { AIService, SseEvent } from './ai.service';
import { SensitiveWordFilter } from './sensitive-word.filter';

/**
 * AIService 单元测试
 *
 * 覆盖核心场景（对应 PRD 4.4 / 5.4 / 7.2）：
 *   - 项目归属校验失败 -> 推送 error，且不消耗额度
 *   - 额度不足 -> 推送 error
 *   - 敏感词命中 -> 退还额度并推送 error（PRD 4.4.3 + 5.4）
 *   - JSON 解析失败/空数组 -> 退还额度并推送 error
 *   - 正常流程：chunk * N -> copy * N -> done，并写入 DB
 *   - Provider 抛错 -> 退还额度并推送 error
 *
 * 测试策略：
 *   - Mock Provider 通过 of(...) 返回固定 chunk 序列；
 *   - 用 toArray 收集所有 SSE 事件后断言序列；
 *   - QuotaService 用对象 Mock，验证 consume / refund 调用次数。
 */
describe('AIService', () => {
  let service: AIService;
  let projectRepo: { findOne: jest.Mock };
  let copyRepo: { create: jest.Mock; save: jest.Mock };
  let quotaService: {
    consume: jest.Mock;
    refund: jest.Mock;
    getTodayRemaining: jest.Mock;
  };
  let provider: AIProvider & { generateStream: jest.Mock };

  /** 把 Observable<SseEvent> 收集成数组，便于断言事件序列 */
  const collect = (obs: Observable<SseEvent>): Promise<SseEvent[]> =>
    new Promise((resolve, reject) => {
      const events: SseEvent[] = [];
      obs.subscribe({
        next: (e) => events.push(e),
        error: reject,
        complete: () => resolve(events),
      });
    });

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn() };
    copyRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => ({ id: 999, ...d })),
    };
    quotaService = {
      consume: jest.fn().mockResolvedValue(true),
      refund: jest.fn().mockResolvedValue(undefined),
      getTodayRemaining: jest
        .fn()
        .mockResolvedValue({ remaining: 9, used: 1, max: 10 }),
    };
    provider = {
      name: 'mock',
      generateStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        SensitiveWordFilter,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: projectRepo,
        },
        { provide: getRepositoryToken(CopyEntity), useValue: copyRepo },
        { provide: AI_PROVIDER, useValue: provider },
        { provide: QuotaService, useValue: quotaService },
        {
          provide: ConfigService,
          useValue: {
            get: <T,>(_k: string, def?: T): T => def as T,
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  // ------------------------------------------------------------------
  // 异常前置：项目归属
  // ------------------------------------------------------------------
  it('项目不存在时推送 error 且不消耗额度', async () => {
    projectRepo.findOne.mockResolvedValueOnce(null);

    const events = await collect(
      service.generateStream(1, 999, CopyChannel.XIAOHONGSHU),
    );

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(quotaService.consume).not.toHaveBeenCalled();
    expect(quotaService.refund).not.toHaveBeenCalled();
  });

  it('项目归属不匹配时推送 error 且不消耗额度（PRD 7.2 防越权）', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 2, // 真实持有人是 user=2
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    expect(events[0].event).toBe('error');
    expect(quotaService.consume).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 额度
  // ------------------------------------------------------------------
  it('额度不足时推送 error（不调用 Provider）', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });
    quotaService.consume.mockResolvedValueOnce(false);

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    expect(events.find((e) => e.event === 'error')).toBeDefined();
    expect(provider.generateStream).not.toHaveBeenCalled();
    // 未扣到额度 -> 无需 refund
    expect(quotaService.refund).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 正常流程
  // ------------------------------------------------------------------
  it('正常流程：chunk * N -> copy * N -> done，并入库', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '一款主打天然成分的洗发水',
      targetAudience: '25-35 岁女性',
    });

    // Provider 流：拼起来是合法 JSON 数组（3 条）
    const json = JSON.stringify(['文案A', '文案B', '文案C']);
    const chunks = [json.slice(0, 5), json.slice(5, 15), json.slice(15)];
    provider.generateStream.mockReturnValueOnce(of(...chunks));

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    const chunkEvents = events.filter((e) => e.event === 'chunk');
    const copyEvents = events.filter((e) => e.event === 'copy');
    const doneEvents = events.filter((e) => e.event === 'done');

    expect(chunkEvents).toHaveLength(3);
    expect(copyEvents).toHaveLength(3);
    expect(doneEvents).toHaveLength(1);
    // 没有 error
    expect(events.find((e) => e.event === 'error')).toBeUndefined();
    // 三条都进 DB
    expect(copyRepo.save).toHaveBeenCalledTimes(3);
    // done 携带剩余额度
    expect((doneEvents[0] as { data: { remaining: number } }).data.remaining).toBe(9);
    // 未触发回滚
    expect(quotaService.refund).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 敏感词
  // ------------------------------------------------------------------
  it('敏感词命中时退还额度并推送 error（PRD 5.4）', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });
    // "最佳" 在 SensitiveWordFilter 默认词表里
    provider.generateStream.mockReturnValueOnce(of('["最佳产品推荐"]'));

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    expect(events.find((e) => e.event === 'error')).toBeDefined();
    expect(events.find((e) => e.event === 'copy')).toBeUndefined();
    expect(quotaService.refund).toHaveBeenCalledTimes(1);
    expect(copyRepo.save).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 解析失败
  // ------------------------------------------------------------------
  it('解析为空时退还额度并推送 error', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });
    // 既不是 JSON，也无法切出任何片段
    provider.generateStream.mockReturnValueOnce(of('   '));

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    expect(events.find((e) => e.event === 'error')).toBeDefined();
    expect(quotaService.refund).toHaveBeenCalledTimes(1);
    expect(copyRepo.save).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Provider 抛错
  // ------------------------------------------------------------------
  it('Provider 抛错时退还额度并推送 error', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });
    provider.generateStream.mockReturnValueOnce(
      throwError(() => new Error('upstream boom')),
    );

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.XIAOHONGSHU),
    );

    expect(events.find((e) => e.event === 'error')).toBeDefined();
    expect(quotaService.refund).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------------
  // 兜底解析（编号切分）
  // ------------------------------------------------------------------
  it('非 JSON 输出按编号兜底切分（解析失败兜底路径）', async () => {
    projectRepo.findOne.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      name: 'demo',
      productDesc: '描述',
      targetAudience: null,
    });
    const text = '文案一\n\n2. 文案二\n\n3. 文案三';
    provider.generateStream.mockReturnValueOnce(of(text));

    const events = await collect(
      service.generateStream(1, 1, CopyChannel.MOMENTS),
    );

    const copyEvents = events.filter((e) => e.event === 'copy');
    expect(copyEvents.length).toBeGreaterThanOrEqual(2);
    expect(events.find((e) => e.event === 'done')).toBeDefined();
  });
});
