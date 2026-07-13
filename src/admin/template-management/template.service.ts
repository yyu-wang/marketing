import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { PromptTemplateEntity } from '../../database/entities/prompt-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateQueryDto } from './dto/template-query.dto';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(PromptTemplateEntity)
    private readonly templateRepo: Repository<PromptTemplateEntity>,
  ) {}

  async list(query: TemplateQueryDto) {
    const { name, channel, page = 1, pageSize = 20 } = query;
    const where: Record<string, unknown> = {};
    if (name) where.name = Like(`%${name}%`);
    if (channel) where.channel = channel;

    const [list, total] = await this.templateRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async create(dto: CreateTemplateDto) {
    const template = this.templateRepo.create(dto);
    const saved = await this.templateRepo.save(template);
    return saved;
  }

  async update(id: number, dto: UpdateTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.channel !== undefined) template.channel = dto.channel;
    if (dto.content !== undefined) template.content = dto.content;

    return this.templateRepo.save(template);
  }

  async remove(id: number) {
    const template = await this.templateRepo.findOne({ where: { id }, select: ['id'] });
    if (!template) throw new NotFoundException('模板不存在');
    await this.templateRepo.remove(template);
    return { deleted: true };
  }
}
