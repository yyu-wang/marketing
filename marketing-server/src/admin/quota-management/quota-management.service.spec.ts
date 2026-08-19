import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getTodayKey } from '../../common/utils/date';
import { QuotaRecordEntity } from '../../database/entities/quota-record.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { QuotaManagementService } from './quota-management.service';

describe('QuotaManagementService', () => {
  let service: QuotaManagementService;
  let userRepo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let quotaRepo: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const buildChain = () => {
    const obj: Record<string, jest.Mock> = {
      execute: jest.fn().mockResolvedValue({}),
      insert: jest.fn(() => obj),
      into: jest.fn(() => obj),
      values: jest.fn(() => obj),
      orUpdate: jest.fn(() => obj),
    };
    return obj;
  };

  beforeEach(async () => {
    userRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    quotaRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(buildChain),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaManagementService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(QuotaRecordEntity), useValue: quotaRepo },
        {
          provide: ConfigService,
          useValue: { get: (k: string, def?: unknown) => def ?? 'test' },
        },
      ],
    }).compile();

    service = module.get<QuotaManagementService>(QuotaManagementService);
  });

  describe('list', () => {
    it('无记录用户 dailyLimit 回退到 users.daily_quota', async () => {
      userRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 1, email: 'a@b.com', nickname: 'A', isActive: 1, dailyQuota: 30 },
          { id: 2, email: 'c@d.com', nickname: 'C', isActive: 1, dailyQuota: null },
        ],
        2,
      ]);
      quotaRepo.find.mockResolvedValueOnce([]);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.total).toBe(2);
      expect(result.list[0]).toEqual(
        expect.objectContaining({ id: 1, todayUsed: 0, dailyLimit: 30 }),
      );
      // dailyQuota 为 null → 回退环境默认 50
      expect(result.list[1].dailyLimit).toBe(50);
    });

    it('今日有记录的合并已用次数与 max_count', async () => {
      userRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 1, email: 'a@b.com', nickname: 'A', isActive: 1, dailyQuota: 30 }],
        1,
      ]);
      quotaRepo.find.mockResolvedValueOnce([
        { userId: 1, usedCount: 7, maxCount: 40 },
      ]);

      const result = await service.list({});

      expect(result.list[0]).toEqual(
        expect.objectContaining({ id: 1, todayUsed: 7, dailyLimit: 40 }),
      );
    });
  });

  describe('setLimit', () => {
    it('应更新 users.daily_quota 并同步今日记录 max_count', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 1 });

      await service.setLimit(1, 99);

      expect(userRepo.update).toHaveBeenCalledWith(1, { dailyQuota: 99 });

      const chain = quotaRepo.createQueryBuilder.mock.results[0].value;
      expect(chain.insert).toHaveBeenCalled();
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, recordDate: getTodayKey(), usedCount: 0, maxCount: 99 }),
      );
      expect(chain.orUpdate).toHaveBeenCalledWith(['max_count'], ['user_id', 'record_date']);
    });

    it('用户不存在应抛出 NotFoundException', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.setLimit(999, 50)).rejects.toBeInstanceOf(NotFoundException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });
});
