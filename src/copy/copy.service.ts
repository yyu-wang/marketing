import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CopyChannel, CopyEntity } from '../database/entities/copy.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { UpdateCopyDto } from './dto/copy.dto';

/**
 * 文案服务
 *
 * 对应 PRD 4.5 文案管理模块：列表、筛选、收藏、编辑、删除、复制。
 *
 * 安全规则：
 *   - 所有操作必须校验文案所属项目的归属，防止越权（PRD 7.2）；
 *   - 编辑保存后强制设置 is_edited = true，用于 AI 质量代理指标。
 */
@Injectable()
export class CopyService {
  constructor(
    @InjectRepository(CopyEntity)
    private readonly copyRepo: Repository<CopyEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
  ) {}

  /**
   * 列出某项目下的文案
   *
   * 按渠道筛选 + 按创建时间排序（默认倒序，对应 PRD 4.5.1）。
   */
  async listByProject(
    userId: number,
    projectId: number,
    channel?: CopyChannel,
    order: 'asc' | 'desc' = 'desc',
  ): Promise<CopyEntity[]> {
    await this.assertProjectOwnership(userId, projectId);
    return this.copyRepo.find({
      where: {
        projectId,
        ...(channel ? { channel } : {}),
      },
      order: { createdAt: order === 'asc' ? 'ASC' : 'DESC' },
    });
  }

  /**
   * 编辑文案
   *
   * 字数上限 1000 字（PRD 4.5.2），DTO 已校验。
   * 编辑后将 is_edited 标记为 true，前端 UI 显示"已修改"标签。
   */
  async update(userId: number, copyId: number, dto: UpdateCopyDto): Promise<CopyEntity> {
    const copy = await this.findOwnedCopyOrFail(userId, copyId);
    copy.content = dto.content;
    copy.isEdited = true;
    return this.copyRepo.save(copy);
  }

  /**
   * 切换收藏状态
   *
   * 若入参 isStarred 未指定 -> 在当前值上取反；
   * 指定 -> 按入参强制设置（用于幂等收藏 API）。
   */
  async toggleStar(
    userId: number,
    copyId: number,
    target?: boolean,
  ): Promise<CopyEntity> {
    const copy = await this.findOwnedCopyOrFail(userId, copyId);
    copy.isStarred = target ?? !copy.isStarred;
    return this.copyRepo.save(copy);
  }

  /** 删除单条 */
  async remove(userId: number, copyId: number): Promise<void> {
    const copy = await this.findOwnedCopyOrFail(userId, copyId);
    await this.copyRepo.remove(copy);
  }

  /**
   * 批量删除
   *
   * 仅删除当前用户名下的文案；非法 ID 静默忽略，最终返回成功删除数。
   */
  async removeBatch(userId: number, copyIds: number[]): Promise<{ deleted: number }> {
    if (copyIds.length === 0) return { deleted: 0 };

    // 仅取该用户名下的文案（通过 join project 校验）
    const copies = await this.copyRepo
      .createQueryBuilder('c')
      .innerJoin(ProjectEntity, 'p', 'p.id = c.project_id')
      .where('c.id IN (:...ids)', { ids: copyIds })
      .andWhere('p.user_id = :uid', { uid: userId })
      .getMany();

    if (copies.length === 0) return { deleted: 0 };
    await this.copyRepo.remove(copies);
    return { deleted: copies.length };
  }

  // -------------------------------------------------------------------
  // 工具：归属校验
  // -------------------------------------------------------------------

  /** 校验项目归属（用于列表场景） */
  private async assertProjectOwnership(userId: number, projectId: number): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'userId'],
    });
    if (!project) throw new NotFoundException('项目不存在或已被删除');
    if (Number(project.userId) !== Number(userId)) throw new ForbiddenException('无权访问该项目');
  }

  /**
   * 通过文案 ID 校验归属并返回实体
   *
   * 流程：copy -> project -> 校验 user_id；任何一环失败抛 403/404。
   */
  private async findOwnedCopyOrFail(
    userId: number,
    copyId: number,
  ): Promise<CopyEntity> {
    const copy = await this.copyRepo.findOne({ where: { id: copyId } });
    if (!copy) throw new NotFoundException('文案不存在或已被删除');

    const project = await this.projectRepo.findOne({
      where: { id: copy.projectId },
      select: ['id', 'userId'],
    });
    if (!project || Number(project.userId) !== Number(userId)) {
      throw new ForbiddenException('无权操作该文案');
    }
    return copy;
  }

  // -------------------------------------------------------------------
  // 数据看板辅助查询（被 Analytics 模块调用）
  // -------------------------------------------------------------------

  /**
   * 按渠道聚合本人文案数量（用于看板饼图）
   */
  async aggregateByChannel(userId: number): Promise<Record<CopyChannel, number>> {
    const rows = await this.copyRepo
      .createQueryBuilder('c')
      .select('c.channel', 'channel')
      .addSelect('COUNT(c.id)', 'cnt')
      .innerJoin(ProjectEntity, 'p', 'p.id = c.project_id')
      .where('p.user_id = :uid', { uid: userId })
      .groupBy('c.channel')
      .getRawMany<{ channel: CopyChannel; cnt: string }>();

    const base = {
      [CopyChannel.XIAOHONGSHU]: 0,
      [CopyChannel.MOMENTS]: 0,
      [CopyChannel.AD_SLOGAN]: 0,
    } as Record<CopyChannel, number>;
    for (const r of rows) base[r.channel] = Number(r.cnt);
    return base;
  }

  /**
   * 收藏排行 TOP N（用于看板）
   *
   * 当前以 is_starred 计数，未来可扩展为 starred_at 时间加权。
   */
  async topStarred(userId: number, limit = 5): Promise<CopyEntity[]> {
    return this.copyRepo
      .createQueryBuilder('c')
      .innerJoin(ProjectEntity, 'p', 'p.id = c.project_id')
      .where('p.user_id = :uid', { uid: userId })
      .andWhere('c.is_starred = TRUE')
      .orderBy('c.updated_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * 近 N 日每日生成趋势
   *
   * 返回按日期升序的 { date, count } 数组（用于折线图）。
   */
  async dailyTrend(
    userId: number,
    days = 7,
  ): Promise<Array<{ date: string; count: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await this.copyRepo
      .createQueryBuilder('c')
      .select("DATE_FORMAT(c.created_at, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(c.id)', 'count')
      .innerJoin(ProjectEntity, 'p', 'p.id = c.project_id')
      .where('p.user_id = :uid', { uid: userId })
      .andWhere('c.created_at >= :since', { since })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }
}
