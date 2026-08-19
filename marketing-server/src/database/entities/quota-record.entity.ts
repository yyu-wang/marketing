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
import { UserEntity } from './user.entity';

@Entity('quota_records')
@Index('uk_quota_user_date', ['userId', 'recordDate'], { unique: true })
export class QuotaRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  /** 与 users.id 保持一致为非 unsigned，否则 MySQL 外键类型不匹配无法建 FK */
  @Column({ type: 'bigint', name: 'user_id', nullable: false })
  userId: number;

  /**
   * 关系需显式声明（含 ON DELETE CASCADE），否则 DB_SYNC 的 synchronize
   * 会因实体无外键定义而删掉迁移创建的外键，删除用户时遗留孤儿额度记录。
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'date', name: 'record_date', nullable: false })
  recordDate: string;

  @Column({ type: 'int', name: 'used_count', unsigned: true, default: 0 })
  usedCount: number;

  @Column({ type: 'int', name: 'max_count', unsigned: true, default: 50 })
  maxCount: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
