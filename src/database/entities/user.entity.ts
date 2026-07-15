import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

/**
 * User 用户实体
 *
 * 对应 PRD 10.2 节 User 字段定义。
 * 注意：
 *   - password_hash 必须使用 bcrypt 加密存储（cost factor >= 12）；
 *   - 严禁明文日志输出 password 字段；
 *   - email 建立唯一索引，保证重复注册时 DB 层兜底返回 409。
 */
@Entity('users')
export class UserEntity {
  /** 用户唯一标识（BIGINT, PK, AUTO_INCREMENT） */
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /** 注册邮箱，全局唯一（UK） */
  @Index('uk_user_email', { unique: true })
  @Column({ type: 'varchar', length: 255, name: 'email', nullable: false })
  email: string;

  /** bcrypt 哈希值，禁止明文存储 */
  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: false })
  passwordHash: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  /** 用户角色：admin / user，默认 user */
  @Column({ type: 'varchar', length: 20, name: 'role', default: 'user' })
  role: string;

  /** 账户启用状态：1=启用 0=停用，默认启用 */
  @Column({ type: 'tinyint', width: 1, name: 'is_active', default: 1 })
  isActive: number;

  /**
   * 密码哈希版本
   * 0 = bcrypt(明文) — 旧格式
   * 1 = bcrypt(SHA256(明文)) — 新格式（客户端 SHA-256 后传输）
   */
  @Column({ type: 'tinyint', width: 1, name: 'password_version', default: 0 })
  passwordVersion: number;

  // -------------------------------------------------------------------
  // 关系：一个用户可创建多个项目、多条额度记录
  // -------------------------------------------------------------------
  @OneToMany(() => ProjectEntity, (project) => project.user)
  projects: ProjectEntity[];
}
