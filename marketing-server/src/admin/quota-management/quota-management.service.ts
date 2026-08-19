import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { getTodayKey } from '../../common/utils/date';
import { QuotaRecordEntity } from '../../database/entities/quota-record.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { QuotaQueryDto } from './dto/quota-query.dto';

const DEFAULT_DAILY_LIMIT = 50;

@Injectable()
export class QuotaManagementService {
  private readonly defaultDailyLimit: number;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(QuotaRecordEntity)
    private readonly quotaRepo: Repository<QuotaRecordEntity>,
    config: ConfigService,
  ) {
    // env 读取的默认值实为字符串，需显式转数字，避免返回类型不一致
    this.defaultDailyLimit = Number(config.get<number>('QUOTA_DAILY_DEFAULT', DEFAULT_DAILY_LIMIT));
  }

  async list(query: QuotaQueryDto) {
    const { email, page = 1, pageSize = 20 } = query;
    const where: Record<string, unknown> = {};
    if (email) where.email = Like(`%${email}%`);

    const [users, total] = await this.userRepo.findAndCount({
      where,
      select: ['id', 'email', 'nickname', 'isActive', 'dailyQuota'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });

    const records = await this.quotaRepo.find({
      where: { recordDate: getTodayKey() },
      select: ['userId', 'usedCount', 'maxCount'],
    });
    const recordMap = new Map(records.map((r) => [Number(r.userId), r]));

    const list = users.map((u) => {
      const record = recordMap.get(Number(u.id));
      return {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        isActive: u.isActive,
        todayUsed: record?.usedCount ?? 0,
        dailyLimit: record?.maxCount ?? u.dailyQuota ?? this.defaultDailyLimit,
      };
    });

    return { list, total, page, pageSize };
  }

  async setLimit(userId: number, dailyQuota: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id'] });
    if (!user) throw new NotFoundException('用户不存在');

    await this.userRepo.update(userId, { dailyQuota });

    // 同步今日额度记录：仅覆盖 max_count，保留已累计的 used_count
    await this.quotaRepo
      .createQueryBuilder()
      .insert()
      .into(QuotaRecordEntity)
      .values({ userId, recordDate: getTodayKey(), usedCount: 0, maxCount: dailyQuota })
      .orUpdate(['max_count'], ['user_id', 'record_date'])
      .execute();

    return { userId, dailyQuota };
  }
}
