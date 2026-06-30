import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { REDIS_CLIENT } from '../database/redis.module';
import { QuotaService } from './quota.service';

/**
 * QuotaService 单元测试
 *
 * 覆盖关键场景（对应 PRD 4.4.4 / 4.7）：
 *   - getTodayRemaining：Redis 命中 → 直接返回；未命中 → 从 MySQL 加载并回写 Redis
 *   - consume：Lua 返回 0 → 额度不足；Lua 返回正数 → 扣减成功并更新 MySQL
 *   - refund：调用 Lua 退还脚本并递减 MySQL 计数
 *   - hasQuota：基于 getTodayRemaining 的语义包装
 *
 * 测试策略：
 *   - 用对象 Mock 替代 ioredis 客户端（get/set/eval）；
 *   - 用对象 Mock 替代 Repository（findOne/create/save/update）；
 *   - 不实际执行 Lua 脚本，而是直接验证调用参数与返回值。
 */
describe('QuotaService', () => {
  let service: QuotaService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    eval: jest.Mock;
  };
  let quotaRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn(),
    };
    quotaRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => ({ id: 1, ...d })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: getRepositoryToken(QuotaRecordEntity), useValue: quotaRepo },
        { provide: REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: <T,>(_k: string, def?: T): T => def as T,
          },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  // ------------------------------------------------------------------
  // getTodayRemaining
  // ------------------------------------------------------------------
  describe('getTodayRemaining', () => {
    it('Redis 命中时直接返回缓存剩余次数', async () => {
      redis.get.mockResolvedValueOnce('7');

      const result = await service.getTodayRemaining(1);

      expect(result).toEqual({ remaining: 7, used: 3, max: 10 });
      // 未触发 DB 查询
      expect(quotaRepo.findOne).not.toHaveBeenCalled();
      // 未重新写回缓存
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('Redis 未命中时从 MySQL 加载并回写 Redis', async () => {
      redis.get.mockResolvedValueOnce(null);
      // DB 已有当日记录（已用 3 次）
      quotaRepo.findOne.mockResolvedValueOnce({
        id: 1,
        userId: 1,
        recordDate: '20260626',
        usedCount: 3,
        maxCount: 10,
      });

      const result = await service.getTodayRemaining(1);

      expect(result.remaining).toBe(7);
      expect(result.used).toBe(3);
      expect(result.max).toBe(10);
      // 缓存被回写
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^quota:1:\d{8}$/),
        '7',
        'EX',
        expect.any(Number),
      );
    });

    it('Redis 未命中且 DB 无记录时创建新记录，初始剩余 10', async () => {
      redis.get.mockResolvedValueOnce(null);
      quotaRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.getTodayRemaining(2);

      expect(result).toEqual({ remaining: 10, used: 0, max: 10 });
      expect(quotaRepo.save).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // hasQuota
  // ------------------------------------------------------------------
  describe('hasQuota', () => {
    it('剩余 > 0 时返回 true', async () => {
      redis.get.mockResolvedValueOnce('1');
      await expect(service.hasQuota(1)).resolves.toBe(true);
    });

    it('剩余 = 0 时返回 false（PRD 4.4.1 按钮置灰前置条件）', async () => {
      redis.get.mockResolvedValueOnce('0');
      await expect(service.hasQuota(1)).resolves.toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // consume
  // ------------------------------------------------------------------
  describe('consume', () => {
    it('Lua 返回 0 时表示额度不足，返回 false 且不写 DB', async () => {
      redis.eval.mockResolvedValueOnce(0);

      const ok = await service.consume(1);

      expect(ok).toBe(false);
      // 不应触达 DB 写入路径
      expect(quotaRepo.update).not.toHaveBeenCalled();
    });

    it('Lua 返回正数时扣减成功并 +1 累加 MySQL', async () => {
      redis.eval.mockResolvedValueOnce(5); // 剩余 5
      quotaRepo.findOne
        // 第一次：loadOrCreateRecord 中查询是否存在
        .mockResolvedValueOnce({
          id: 10,
          userId: 1,
          recordDate: '20260626',
          usedCount: 4,
          maxCount: 10,
        })
        // 第二次：bumpRecordInDb 重读最新值
        .mockResolvedValueOnce({
          id: 10,
          userId: 1,
          recordDate: '20260626',
          usedCount: 4,
          maxCount: 10,
        });

      const ok = await service.consume(1);

      expect(ok).toBe(true);
      // used_count 应从 4 -> 5
      expect(quotaRepo.update).toHaveBeenCalledWith(10, { usedCount: 5 });
    });

    it('Lua 调用应携带正确的键名格式 quota:{userId}:{yyyyMMdd}', async () => {
      redis.eval.mockResolvedValueOnce(0);

      await service.consume(42);

      const [, , key] = redis.eval.mock.calls[0];
      expect(key).toMatch(/^quota:42:\d{8}$/);
    });
  });

  // ------------------------------------------------------------------
  // refund
  // ------------------------------------------------------------------
  describe('refund', () => {
    it('应调用 Lua 退还脚本并 -1 递减 MySQL', async () => {
      redis.eval.mockResolvedValueOnce(6);
      quotaRepo.findOne
        .mockResolvedValueOnce({
          id: 20,
          userId: 1,
          recordDate: '20260626',
          usedCount: 5,
          maxCount: 10,
        })
        .mockResolvedValueOnce({
          id: 20,
          userId: 1,
          recordDate: '20260626',
          usedCount: 5,
          maxCount: 10,
        });

      await service.refund(1);

      expect(redis.eval).toHaveBeenCalled();
      // used_count 从 5 -> 4
      expect(quotaRepo.update).toHaveBeenCalledWith(20, { usedCount: 4 });
    });

    it('退还时 used_count 不会变为负数（max(0, ...) 保护）', async () => {
      redis.eval.mockResolvedValueOnce(10);
      quotaRepo.findOne
        .mockResolvedValueOnce({
          id: 30,
          userId: 1,
          recordDate: '20260626',
          usedCount: 0,
          maxCount: 10,
        })
        .mockResolvedValueOnce({
          id: 30,
          userId: 1,
          recordDate: '20260626',
          usedCount: 0,
          maxCount: 10,
        });

      await service.refund(1);

      expect(quotaRepo.update).toHaveBeenCalledWith(30, { usedCount: 0 });
    });
  });
});
