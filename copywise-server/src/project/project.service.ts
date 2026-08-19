import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../database/entities/project.entity';
import { findOwnedOrFail } from '../common/utils/ownership';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

/**
 * 项目服务
 *
 * 对应 PRD 4.3 项目管理模块：创建、列表、详情、编辑、删除。
 *
 * 关键安全规则：
 *   - 所有读写操作都必须先校验 user_id 归属，防止越权（PRD 7.2）；
 *   - 项目名称在用户范围内唯一（4.3.1），由 DB 唯一索引兜底，
 *     业务层提前判定以返回更友好的错误信息。
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
  ) {}

  /** 创建项目 */
  async create(userId: number, dto: CreateProjectDto): Promise<ProjectEntity> {
    // 同一用户范围内项目名称唯一
    const duplicated = await this.projectRepo.findOne({
      where: { userId, name: dto.name },
      select: ['id'],
    });
    if (duplicated) {
      throw new ConflictException('已存在同名项目，请更换名称');
    }

    const project = this.projectRepo.create({
      userId,
      name: dto.name,
      productDesc: dto.productDesc,
      targetAudience: dto.targetAudience ?? null,
    });
    return this.projectRepo.save(project);
  }

  /** 列表：当前用户全部项目，按创建时间倒序（PRD 4.3.2） */
  async list(userId: number): Promise<ProjectEntity[]> {
    return this.projectRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 详情（含归属校验） */
  async findOneOrFail(userId: number, projectId: number): Promise<ProjectEntity> {
    return findOwnedOrFail(this.projectRepo, projectId, userId, {
      notFoundMsg: '项目不存在或已被删除',
      forbiddenMsg: '无权访问该项目',
    });
  }

  /**
   * 编辑项目
   *
   * 业务规则：
   *   - 仅创建者可编辑（4.3.3）；
   *   - 改名时再次校验唯一性。
   */
  async update(
    userId: number,
    projectId: number,
    dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.findOneOrFail(userId, projectId);

    if (dto.name && dto.name !== project.name) {
      const duplicate = await this.projectRepo.findOne({
        where: { userId, name: dto.name },
        select: ['id'],
      });
      if (duplicate) throw new ConflictException('已存在同名项目，请更换名称');
      project.name = dto.name;
    }
    if (dto.productDesc !== undefined) project.productDesc = dto.productDesc;
    if (dto.targetAudience !== undefined) {
      project.targetAudience = dto.targetAudience || null;
    }

    return this.projectRepo.save(project);
  }

  /**
   * 删除项目
   *
   * 业务规则（4.3.3）：
   *   - 仅创建者可删除；
   *   - 级联删除该项目下所有文案（数据库 ON DELETE CASCADE）；
   *   - 二次确认由前端负责（弹窗）。
   */
  async remove(userId: number, projectId: number): Promise<void> {
    const project = await this.findOneOrFail(userId, projectId);
    await this.projectRepo.remove(project);
  }
}
