import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('quota_records')
@Index('uk_quota_user_date', ['userId', 'recordDate'], { unique: true })
export class QuotaRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ type: 'bigint', name: 'user_id', unsigned: true, nullable: false })
  userId: number;

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
