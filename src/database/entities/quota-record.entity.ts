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

/**
 * QuotaRecord 额度记录实体
 *
 * 对应 PRD 10.2 节 QuotaRecord 字段定义、4.7 节额度管理模块。
 * 设计要点：
 *   - (user_id, record_date) 复合唯一索引，确保单日一行；
 *   - used_count 自然日（UTC+8）周期，次日 00:00 重置；
 *   - 与 Redis 双写一致：Redis 失效后从此表恢复（4.7.1 同步机制）；
 *   - max_count 由管理员可配置（V2 后台），MVP 默认 10。
 */
@Entity('quota_records')
@Index('uk_quota_user_date', ['userId', 'recordDate'], { unique: true })
export class QuotaRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /** 用户 ID（FK） */
  @Column({ type: 'bigint', name: 'user_id', nullable: false })
  userId: number;

  /** 记录日期（按 UTC+8 自然日） */
  @Column({ type: 'date', name: 'record_date', nullable: false })
  recordDate: string; // ISO 日期串 yyyy-MM-dd

  /** 当日已使用次数 */
  @Column({ type: 'int', name: 'used_count', default: 0 })
  usedCount: number;

  /** 当日上限（默认 10，可由管理员配置） */
  @Column({ type: 'int', name: 'max_count', default: 10 })
  maxCount: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.quotaRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
