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
import { ConversationEntity } from './conversation.entity';

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error';

/**
 * Message 消息实体
 *
 * 一条对话由多条消息组成，包含两类：
 *   - role='user'：用户输入，content 存文本，imageUrls 存图片 URL 数组（JSON）；
 *   - role='assistant'：AI 输出，content 存回复文本。
 *
 * status：assistant 消息的生成状态机
 *   pending → streaming → done|error
 */
@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Index('idx_msg_conv')
  @Column({ type: 'bigint', name: 'conversation_id', nullable: false })
  conversationId: number;

  @Column({ type: 'varchar', length: 16, name: 'role', nullable: false })
  role: MessageRole;

  @Column({ type: 'text', name: 'content', nullable: true })
  content: string | null;

  /** 仅 user 消息使用：上传图片 URL 数组（JSON），最多 9 张 */
  @Column({
    type: 'text',
    name: 'image_urls',
    nullable: true,
    transformer: {
      to: (value: string[] | null) => (value ? JSON.stringify(value) : null),
      from: (value: string | null) => (value ? JSON.parse(value) : null),
    },
  })
  imageUrls: string[] | null;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'status',
    nullable: false,
    default: 'done',
  })
  status: MessageStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ConversationEntity, (c) => c.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;
}
