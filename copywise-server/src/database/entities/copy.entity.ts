import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

/**
 * 渠道枚举（小红书 / 朋友圈 / 广告语）
 *
 * 对应 PRD 4.4.2 渠道列表。新增渠道仅需追加枚举值与 Prompt 模板。
 */
export enum CopyChannel {
  XIAOHONGSHU = 'xiaohongshu',
  MOMENTS = 'moments',
  AD_SLOGAN = 'ad_slogan',
}

/**
 * Copy 文案实体
 *
 * 对应 PRD 10.2 节 Copy 字段定义。
 * 业务规则（4.5.2）：
 *   - content 字数上限 1000 字（前端 + 后端双重校验）；
 *   - 编辑保存后将 is_edited 置为 true；
 *   - is_starred 用于收藏功能与看板的收藏排行统计。
 */
@Entity('copies')
export class CopyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /** 所属项目（FK） */
  @Index('idx_copy_project')
  @Column({ type: 'bigint', name: 'project_id', nullable: false })
  projectId: number;

  /** 渠道枚举字符串 */
  @Index('idx_copy_channel')
  @Column({ type: 'varchar', length: 20, name: 'channel', nullable: false })
  channel: CopyChannel;

  /** 文案内容（最多 1000 字） */
  @Column({ type: 'varchar', length: 1000, name: 'content', nullable: false })
  content: string;

  /** 是否收藏 */
  @Column({ type: 'boolean', name: 'is_starred', default: false })
  isStarred: boolean;

  /** 是否被用户编辑过（用于 AI 质量代理指标，对应 PRD 5.2） */
  @Column({ type: 'boolean', name: 'is_edited', default: false })
  isEdited: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.copies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;
}
