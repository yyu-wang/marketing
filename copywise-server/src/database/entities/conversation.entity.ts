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
import { MessageEntity } from './message.entity';

/**
 * Conversation 对话实体
 *
 * 对话式创作场景下的会话容器，一个对话包含若干 user/assistant 消息。
 *
 * 业务规则：
 *   - title：取首条用户消息前 30 字，可由用户改名；
 *   - 删除对话级联删除其下所有 messages（DB ON DELETE CASCADE）。
 */
@Entity('conversations')
@Index('idx_conv_user_updated', ['userId', 'updatedAt'])
export class ConversationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Index('idx_conv_user')
  @Column({ type: 'bigint', name: 'user_id', nullable: false })
  userId: number;

  @Column({ type: 'varchar', length: 60, name: 'title', nullable: false })
  title: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => MessageEntity, (msg) => msg.conversation, { cascade: true })
  messages: MessageEntity[];
}
