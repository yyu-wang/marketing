import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';

const DEFAULT_DAILY_LIMIT = 50;

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  private readonly dailyLimit: number;

  constructor(
    @InjectRepository(QuotaRecordEntity)
    private readonly quotaRepo: Repository<QuotaRecordEntity>,
    config: ConfigService,
  ) {
    this.dailyLimit = config.get<number>('QUOTA_DAILY_DEFAULT', DEFAULT_DAILY_LIMIT);
  }

  async getTodayUsage(userId: number): Promise<{ usedCount: number; dailyLimit: number }> {
    const dateKey = this.todayKey();
    let record = await this.quotaRepo.findOne({ where: { userId, recordDate: dateKey } });
    if (!record) {
      record = await this.quotaRepo.save(
        this.quotaRepo.create({ userId, recordDate: dateKey, usedCount: 0, maxCount: this.dailyLimit }),
      );
    }
    return { usedCount: record.usedCount, dailyLimit: record.maxCount };
  }

  async checkQuota(userId: number): Promise<boolean> {
    const { usedCount, dailyLimit } = await this.getTodayUsage(userId);
    return usedCount < dailyLimit;
  }

  async recordUsage(userId: number): Promise<void> {
    const dateKey = this.todayKey();
    await this.quotaRepo
      .createQueryBuilder()
      .insert()
      .into(QuotaRecordEntity)
      .values({ userId, recordDate: dateKey, usedCount: 1, maxCount: this.dailyLimit })
      .orUpdate(['used_count'], ['user_id', 'record_date'], {
        skipUpdateIfNoValuesChanged: true,
      })
      .execute();

    const record = await this.quotaRepo.findOne({ where: { userId, recordDate: dateKey } });
    if (record) {
      record.usedCount += 1;
      await this.quotaRepo.save(record);
    }
  }

  private todayKey(): string {
    const d = new Date();
    const utc8 = new Date(d.getTime() + 8 * 3600 * 1000);
    return utc8.toISOString().slice(0, 10);
  }
}
