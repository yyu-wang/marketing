import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../database/redis.module';
import { PromptTemplateEntity } from '../../database/entities/prompt-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateQueryDto } from './dto/template-query.dto';

const CACHE_KEY = 'admin:templates:list';
const CACHE_TTL_SEC = 600; // 10 分钟

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(PromptTemplateEntity)
    private readonly templateRepo: Repository<PromptTemplateEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async list(query: TemplateQueryDto) {
    const { name, channel, page = 1, pageSize = 20 } = query;
    // 仅缓存无筛选条件的首页查询
    if (!name && !channel && page === 1) {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as { list: PromptTemplateEntity[]; total: number; page: number; pageSize: number };
    }

    const where: Record<string, unknown> = {};
    if (name) where.name = Like(`%${name}%`);
    if (channel) where.channel = channel;

    const [list, total] = await this.templateRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });

    const result = { list, total, page, pageSize };

    if (!name && !channel && page === 1) {
      await this.redis.set(CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL_SEC);
    }

    return result;
  }

  async create(dto: CreateTemplateDto) {
    const template = this.templateRepo.create(dto);
    const saved = await this.templateRepo.save(template);
    await this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.channel !== undefined) template.channel = dto.channel;
    if (dto.content !== undefined) template.content = dto.content;

    const result = await this.templateRepo.save(template);
    await this.invalidateCache();
    return result;
  }

  async remove(id: number) {
    const template = await this.templateRepo.findOne({ where: { id }, select: ['id'] });
    if (!template) throw new NotFoundException('模板不存在');
    await this.templateRepo.remove(template);
    await this.invalidateCache();
    return { deleted: true };
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.del(CACHE_KEY);
  }
}
