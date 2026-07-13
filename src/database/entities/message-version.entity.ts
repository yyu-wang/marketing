import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('message_versions')
@Index('idx_mv_message', ['messageId'])
export class MessageVersionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ type: 'bigint', name: 'message_id', nullable: false })
  messageId: number;

  @Column({ type: 'int', name: 'version', default: 1 })
  version: number;

  @Column({ type: 'text', name: 'content', nullable: true })
  content: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => MessageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity;
}
