import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { SensitiveWordEntity } from '../../database/entities/sensitive-word.entity';
import { SensitiveWordFilter } from '../../ai/sensitive-word.filter';

@Injectable()
export class SensitiveWordService {
  constructor(
    @InjectRepository(SensitiveWordEntity)
    private readonly wordRepo: Repository<SensitiveWordEntity>,
    private readonly filter: SensitiveWordFilter,
  ) {}

  async list(params: { page?: number; pageSize?: number; word?: string; category?: string }) {
    const { page = 1, pageSize = 20, word, category } = params;
    const where: Record<string, unknown> = {};
    if (word) where.word = Like(`%${word}%`);
    if (category) where.category = category;

    const [list, total] = await this.wordRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async create(dto: { word: string; category?: string }): Promise<SensitiveWordEntity> {
    const saved = await this.wordRepo.save(
      this.wordRepo.create({ word: dto.word, category: dto.category || 'general', isActive: true }),
    );
    await this.filter.publishChange();
    return saved;
  }

  async update(id: number, dto: { word?: string; category?: string; isActive?: boolean }): Promise<SensitiveWordEntity> {
    const entity = await this.wordRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('敏感词不存在');

    if (dto.word !== undefined) entity.word = dto.word;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;

    await this.wordRepo.save(entity);
    await this.filter.publishChange();
    return entity;
  }

  async remove(id: number): Promise<{ deleted: boolean }> {
    const entity = await this.wordRepo.findOne({ where: { id }, select: ['id'] });
    if (!entity) throw new NotFoundException('敏感词不存在');
    await this.wordRepo.remove(entity);
    await this.filter.publishChange();
    return { deleted: true };
  }
}
