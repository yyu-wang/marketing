import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CopyEntity } from './copy.entity';

/**
 * Project 项目实体
 *
 * 对应 PRD 10.2 节 Project 字段定义。
 * 业务规则（4.3.1）：
 *   - 项目名称在用户范围内唯一（user_id + name 复合唯一索引）；
 *   - 创建时自动关联当前用户 ID；
 *   - 删除项目级联删除其下所有文案（数据库 ON DELETE CASCADE）。
 */
@Entity('projects')
@Index('uk_project_user_name', ['userId', 'name'], { unique: true })
export class ProjectEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /** 关联用户（FK），级联删除由业务层 + DB 双层保护 */
  @Index('idx_project_user')
  @Column({ type: 'bigint', name: 'user_id', nullable: false })
  userId: number;

  /** 项目名称（最多 50 字） */
  @Column({ type: 'varchar', length: 50, name: 'name', nullable: false })
  name: string;

  /** 产品描述（最多 500 字） */
  @Column({ type: 'varchar', length: 500, name: 'product_desc', nullable: false })
  productDesc: string;

  /** 目标人群描述（最多 200 字，可选） */
  @Column({ type: 'varchar', length: 200, name: 'target_audience', nullable: true })
  targetAudience: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  // -------------------------------------------------------------------
  // 关系
  // -------------------------------------------------------------------
  @ManyToOne(() => UserEntity, (user) => user.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => CopyEntity, (copy) => copy.project, {
    cascade: true, // 删除项目时级联删除文案
  })
  copies: CopyEntity[];
}
