import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getTodayKey } from '../common/utils/date';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { UserEntity } from '../database/entities/user.entity';

const DEFAULT_DAILY_LIMIT = 50;

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  private readonly dailyLimit: number;

  constructor(
    @InjectRepository(QuotaRecordEntity)
    private readonly quotaRepo: Repository<QuotaRecordEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    config: ConfigService,
  ) {
    // env 读取的默认值实为字符串，需显式转数字，避免配额比较与存储类型不一致
    this.dailyLimit = Number(config.get<number>('QUOTA_DAILY_DEFAULT', DEFAULT_DAILY_LIMIT));
  }

  async getTodayUsage(userId: number): Promise<{ usedCount: number; dailyLimit: number }> {
    const dateKey = getTodayKey();
    let record = await this.quotaRepo.findOne({ where: { userId, recordDate: dateKey } });
    if (!record) {
      record = await this.quotaRepo.save(
        this.quotaRepo.create({
          userId,
          recordDate: dateKey,
          usedCount: 0,
          maxCount: await this.resolveLimit(userId),
        }),
      );
    }
    return { usedCount: record.usedCount, dailyLimit: record.maxCount };
  }

  async checkQuota(userId: number): Promise<boolean> {
    const { usedCount, dailyLimit } = await this.getTodayUsage(userId);
    return usedCount < dailyLimit;
  }

  async recordUsage(userId: number): Promise<void> {
    const recordDate = getTodayKey();
    // 1. 保底建行（orIgnore：已存在则跳过，避免重复清零 used_count）
    await this.quotaRepo
      .createQueryBuilder()
      .insert()
      .into(QuotaRecordEntity)
      .values({ userId, recordDate, usedCount: 0, maxCount: await this.resolveLimit(userId) })
      .orIgnore()
      .execute();
    // 2. 原子递增（并发安全）
    await this.quotaRepo
      .createQueryBuilder()
      .update(QuotaRecordEntity)
      .set({ usedCount: () => 'used_count + 1' })
      .where('user_id = :userId', { userId })
      .andWhere('record_date = :recordDate', { recordDate })
      .execute();
  }

  /** 解析用户每日限额：优先 users.daily_quota，未设置时回退环境变量默认值 */
  private async resolveLimit(userId: number): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['dailyQuota'] });
    return user?.dailyQuota ?? this.dailyLimit;
  }
}
