import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../database/redis.module';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { jwtExtractor } from './token-extractor';

const USER_CACHE_TTL_SEC = 300; // 5 分钟

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('环境变量 JWT_SECRET 未配置，服务无法启动');
    }
    super({
      jwtFromRequest: jwtExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const cacheKey = `user:${payload.sub}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as JwtPayload;
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'role'],
    });

    const result: JwtPayload = {
      sub: Number(payload.sub),
      email: payload.email,
      role: user?.role || 'user',
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', USER_CACHE_TTL_SEC);

    return result;
  }
}
