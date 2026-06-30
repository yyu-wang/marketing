import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../database/redis.module';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';

/**
 * 额度服务
 *
 * 对应 PRD 4.7 额度管理模块与 4.4.4 并发安全要求。
 *
 * 设计思路（PRD 4.7.1 双写策略）：
 *   1. 请求进入 -> 先查 Redis 当日剩余次数；
 *   2. Redis 不存在 -> 从 MySQL 加载并回写 Redis（惰性加载）；
 *   3. 扣减使用 Redis Lua 脚本保证"检查-扣减"原子性，避免并发超卖；
 *   4. 生成成功 -> 同步递增 MySQL 计数（异步补偿兜底）。
 *
 * Redis 键设计：
 *   - quota:{userId}:{yyyyMMdd}  -> 剩余次数
 *   - TTL = 当日剩余秒数，过 00:00 自动失效（PRD 4.4.3）。
 */
@Injectable()
export class QuotaService {
  /** Redis 键前缀 */
  private readonly KEY_PREFIX = 'quota';
  /** 当日默认上限（PRD 4.4.3：默认 10 次，可配置） */
  private readonly dailyDefault: number;

  constructor(
    @InjectRepository(QuotaRecordEntity)
    private readonly quotaRepo: Repository<QuotaRecordEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService,
  ) {
    this.dailyDefault = configService.get<number>('QUOTA_DAILY_DEFAULT', 10);
  }

  // -------------------------------------------------------------------
  // 公开 API
  // -------------------------------------------------------------------

  /**
   * 获取今日剩余次数
   * 对应 PRD 4.7.2：页面顶部常显"今日剩余次数：X/10"。
   */
  async getTodayRemaining(userId: number): Promise<{ remaining: number; used: number; max: number }> {
    const today = this.todayStr();
    const max = this.dailyDefault;

    // 优先走 Redis 缓存
    const cacheKey = this.key(userId, today);
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      const remaining = Number(cached);
      return { remaining, used: max - remaining, max };
    }

    // Redis 未命中 -> 从 MySQL 加载并回写
    const record = await this.loadOrCreateRecord(userId, today);
    const remaining = Math.max(0, record.maxCount - record.usedCount);
    await this.redis.set(cacheKey, String(remaining), 'EX', this.secondsUntilMidnight());
    return { remaining, used: record.usedCount, max: record.maxCount };
  }

  /**
   * 检查额度是否充足（不扣减）
   *
   * 用于生成前的预检，避免无效 AI 调用。
   */
  async hasQuota(userId: number): Promise<boolean> {
    const { remaining } = await this.getTodayRemaining(userId);
    return remaining > 0;
  }

  /**
   * 扣减一次额度（核心原子操作）
   *
   * 使用 Lua 脚本保证"检查 + 扣减"原子性，对应 PRD 4.4.4 关键设计。
   * 返回值：
   *   - true 扣减成功；
   *   - false 额度不足（前端按钮置灰，提示明日再来，PRD 4.4.1）。
   *
   * 失败补偿：
   *   - Redis 扣减成功后，MySQL 写入失败时仅记录日志，由对账任务兜底；
   *   - 生成失败（超时/异常）由调用方调用 refundQuota 回补，PRD 4.4.3"生成失败不扣额度"。
   */
  async consume(userId: number): Promise<boolean> {
    const today = this.todayStr();
    const cacheKey = this.key(userId, today);

    // Lua 脚本：原子检查并扣减，剩余 < 1 时返回 0
    const decremented = await this.redis.eval(
      QuotaService.LUA_CONSUME,
      1,
      cacheKey,
      String(this.dailyDefault),
      String(this.secondsUntilMidnight()),
    );

    if (Number(decremented) === 0) {
      return false; // 额度不足
    }

    // 同步递增 MySQL 计数（首次当日记录创建 + used_count 自增）
    await this.bumpRecordInDb(userId, today, 1);
    return true;
  }

  /**
   * 退还一次额度
   *
   * 对应 PRD 4.4.3：生成失败不扣额度。
   * 调用时机：AI 超时、格式异常等已扣减但最终失败的场景。
   */
  async refund(userId: number): Promise<void> {
    const today = this.todayStr();
    const cacheKey = this.key(userId, today);

    await this.redis.eval(
      QuotaService.LUA_REFUND,
      1,
      cacheKey,
      String(this.dailyDefault),
    );

    await this.bumpRecordInDb(userId, today, -1);
  }

  // -------------------------------------------------------------------
  // 私有工具
  // -------------------------------------------------------------------

  /** 加载或创建当日 MySQL 记录（PRD 4.7.1 同步机制） */
  private async loadOrCreateRecord(
    userId: number,
    today: string,
  ): Promise<QuotaRecordEntity> {
    let record = await this.quotaRepo.findOne({
      where: { userId, recordDate: today },
    });
    if (!record) {
      record = this.quotaRepo.create({
        userId,
        recordDate: today,
        usedCount: 0,
        maxCount: this.dailyDefault,
      });
      try {
        record = await this.quotaRepo.save(record);
      } catch (err) {
        // 并发场景下另一个事务已创建 -> 重新读取
        record =
          (await this.quotaRepo.findOne({
            where: { userId, recordDate: today },
          })) ?? record;
      }
    }
    return record;
  }

  /**
   * MySQL 计数递增 / 递减
   *
   * 使用 UPSERT 保证幂等：存在则更新 used_count，不存在则插入。
   */
  private async bumpRecordInDb(
    userId: number,
    today: string,
    delta: number,
  ): Promise<void> {
    // 确保记录存在
    await this.loadOrCreateRecord(userId, today);

    // 重新查询最新 used_count 并累加，避免负数
    const record = await this.quotaRepo.findOne({
      where: { userId, recordDate: today },
    });
    if (!record) return;

    const newUsed = Math.max(0, record.usedCount + delta);
    await this.quotaRepo.update(record.id, { usedCount: newUsed });
  }

  /** Redis 键构造 */
  private key(userId: number, today: string): string {
    return `${this.KEY_PREFIX}:${userId}:${today}`;
  }

  /** 当日 yyyyMMdd 字符串（UTC+8，PRD 4.4.3 自然日） */
  private todayStr(): string {
    const now = new Date();
    // 转 UTC+8 后取日期串
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    return utc8.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /** 当日剩余秒数（用于 Redis TTL，避免跨日缓存命中） */
  private secondsUntilMidnight(): number {
    const now = new Date();
    // UTC+8 的次日 00:00
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    const midnight = new Date(Date.UTC(
      utc8.getUTCFullYear(),
      utc8.getUTCMonth(),
      utc8.getUTCDate() + 1,
    ));
    return Math.max(1, Math.floor((midnight.getTime() - utc8.getTime()) / 1000));
  }

  // -------------------------------------------------------------------
  // Lua 脚本
  // -------------------------------------------------------------------

  /**
   * 消费脚本
   *
   * KEYS[1] = cacheKey
   * ARGV[1] = dailyMax   （额度上限）
   * ARGV[2] = ttlSeconds  （TTL，过期时间）
   *
   * 逻辑：
   *   - 若 key 不存在 -> 初始化为 dailyMax 并设置 TTL；
   *   - 若 value <= 0 -> 返回 0，不扣减；
   *   - 否则 DECR -> 返回扣减后剩余（>0 即成功）。
   */
  private static readonly LUA_CONSUME = `
    local remaining = redis.call('GET', KEYS[1])
    if not remaining then
      remaining = tonumber(ARGV[1])
      redis.call('SET', KEYS[1], remaining, 'EX', tonumber(ARGV[2]))
    else
      remaining = tonumber(remaining)
    end
    if remaining <= 0 then
      return 0
    end
    local newVal = redis.call('DECR', KEYS[1])
    return newVal
  `;

  /**
   * 退还脚本
   *
   * KEYS[1] = cacheKey
   * ARGV[1] = dailyMax
   *
   * 逻辑：
   *   - key 不存在 -> 不操作（说明 Redis 已过期，下次请求会重新从 DB 加载）；
   *   - value >= dailyMax -> 不再回补，避免溢出；
   *   - 否则 INCR。
   */
  private static readonly LUA_REFUND = `
    local remaining = redis.call('GET', KEYS[1])
    if not remaining then
      return 0
    end
    remaining = tonumber(remaining)
    local maxCount = tonumber(ARGV[1])
    if remaining >= maxCount then
      return maxCount
    end
    return redis.call('INCR', KEYS[1])
  `;
}
