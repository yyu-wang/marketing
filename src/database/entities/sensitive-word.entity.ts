import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sensitive_words')
export class SensitiveWordEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ type: 'varchar', length: 100, name: 'word', nullable: false })
  word: string;

  @Column({ type: 'varchar', length: 50, name: 'category', default: 'general' })
  category: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
