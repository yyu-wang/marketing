import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getTodayKey } from '../common/utils/date';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { UserEntity } from '../database/entities/user.entity';
import { QuotaService } from './quota.service';

/** 可链式调用的 createQueryBuilder 假对象 */
function makeChainableQueryBuilder() {
  const chain: Record<string, jest.Mock> = {};
  const obj: Record<string, jest.Mock> = {
    execute: jest.fn().mockResolvedValue({}),
  };
  for (const method of ['insert', 'update', 'into', 'values', 'orIgnore', 'orUpdate', 'set', 'where', 'andWhere']) {
    obj[method] = jest.fn(() => obj);
  }
  obj.insert = jest.fn(() => obj);
  obj.update = jest.fn(() => obj);
  chain.execute = obj.execute;
  chain.values = obj.values;
  chain.set = obj.set;
  chain.orIgnore = obj.orIgnore;
  chain.orUpdate = obj.orUpdate;
  chain.where = obj.where;
  chain.andWhere = obj.andWhere;
  return obj;
}

describe('QuotaService', () => {
  let service: QuotaService;
  let quotaRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    quotaRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => ({ ...e, id: 1 })),
      create: jest.fn((d) => d),
      createQueryBuilder: jest.fn(makeChainableQueryBuilder),
    };
    userRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: getRepositoryToken(QuotaRecordEntity), useValue: quotaRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        {
          provide: ConfigService,
          useValue: { get: (k: string, def?: unknown) => def ?? 'test' },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  describe('getTodayUsage', () => {
    it('无记录时应按用户的 daily_quota 创建记录', async () => {
      quotaRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce({ dailyQuota: 30 });

      const result = await service.getTodayUsage(7);

      expect(quotaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, recordDate: getTodayKey(), usedCount: 0, maxCount: 30 }),
      );
      expect(result).toEqual({ usedCount: 0, dailyLimit: 30 });
    });

    it('有记录时应返回现有计数，且不触发用户查询', async () => {
      quotaRepo.findOne.mockResolvedValueOnce({
        userId: 7,
        recordDate: getTodayKey(),
        usedCount: 5,
        maxCount: 50,
      });

      const result = await service.getTodayUsage(7);

      expect(result).toEqual({ usedCount: 5, dailyLimit: 50 });
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('checkQuota', () => {
    it('已用未达上限应放行', async () => {
      quotaRepo.findOne.mockResolvedValueOnce({ usedCount: 3, maxCount: 50 });
      await expect(service.checkQuota(7)).resolves.toBe(true);
    });

    it('已用达到上限应拦截', async () => {
      quotaRepo.findOne.mockResolvedValueOnce({ usedCount: 50, maxCount: 50 });
      await expect(service.checkQuota(7)).resolves.toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('应 orIgnore 建行（used_count=0）后原子递增，不复位计数', async () => {
      userRepo.findOne.mockResolvedValueOnce({ dailyQuota: 30 });

      await service.recordUsage(7);

      const chains = quotaRepo.createQueryBuilder.mock.results.map((r) => r.value);
      expect(chains).toHaveLength(2);

      // 1. 保底建行：insert + orIgnore
      const insertChain = chains[0];
      expect(insertChain.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, recordDate: getTodayKey(), usedCount: 0, maxCount: 30 }),
      );
      expect(insertChain.orIgnore).toHaveBeenCalled();

      // 2. 原子递增：used_count + 1（SQL 表达式，而非固定值覆盖）
      const updateChain = chains[1];
      expect(updateChain.update).toHaveBeenCalled();
      const setArg = updateChain.set.mock.calls[0][0] as { usedCount: () => string };
      expect(setArg.usedCount()).toBe('used_count + 1');
      expect(updateChain.where).toHaveBeenCalledWith('user_id = :userId', { userId: 7 });
      expect(updateChain.andWhere).toHaveBeenCalledWith('record_date = :recordDate', { recordDate: getTodayKey() });
    });
  });
});
