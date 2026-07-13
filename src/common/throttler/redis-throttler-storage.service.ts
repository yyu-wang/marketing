import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis, { type RedisOptions } from 'ioredis';

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;
  private disconnectRequired: boolean;

  constructor(redisOrOptions: Redis | RedisOptions) {
    if (redisOrOptions instanceof Redis) {
      this.redis = redisOrOptions;
      this.disconnectRequired = false;
    } else {
      this.redis = new Redis(redisOrOptions);
      this.disconnectRequired = true;
    }
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const result = await this.redis.multi()
      .incr(key)
      .expire(key, Math.ceil(ttl / 1000))
      .exec();

    const totalHits = (result?.[0]?.[1] as number) ?? 1;
    const ttlResult = await this.redis.ttl(key);
    const timeToExpire = ttlResult > 0 ? ttlResult * 1000 : ttl;

    return { totalHits, timeToExpire };
  }

  onModuleDestroy(): void {
    if (this.disconnectRequired) {
      this.redis.disconnect();
    }
  }
}
