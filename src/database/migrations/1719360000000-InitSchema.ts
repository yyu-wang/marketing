import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 初始化数据库 Schema
 *
 * 对应 PRD 10 节数据实体定义，创建：
 *   - users           用户表
 *   - projects        项目表（user 外键 + 用户范围内 name 唯一）
 *   - copies          文案表（project 外键 + channel 索引）
 *   - quota_records   额度记录表（user_id + record_date 唯一）
 *
 * 注意：
 *   - 全部字段使用 utf8mb4，确保 emoji 与中文兼容；
 *   - 字段命名遵循下划线风格，与实体定义中的 @Column name 保持一致；
 *   - 外键使用 ON DELETE CASCADE，满足 PRD 4.3.3 项目删除级联删除文案的要求。
 *
 * 执行：
 *   npm run migration:run     # 应用迁移
 *   npm run migration:revert  # 回滚最后一条迁移
 */
export class InitSchema1719360000000 implements MigrationInterface {
  name = 'InitSchema1719360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -----------------------------------------------------------------
    // 1. users 用户表
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
            comment: '用户唯一标识',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: '注册邮箱（全局唯一）',
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'bcrypt 加密后的密码哈希',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 邮箱唯一索引（数据库层兜底防重复注册）
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'uk_user_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    // -----------------------------------------------------------------
    // 2. projects 项目表
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
          },
          {
            name: 'user_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
            comment: '所属用户',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '项目名称（用户范围内唯一）',
          },
          {
            name: 'product_desc',
            type: 'varchar',
            length: '500',
            isNullable: false,
            comment: '产品描述',
          },
          {
            name: 'target_audience',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '目标人群描述（可选）',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 同一用户范围内项目名称唯一（业务唯一性约束）
    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'uk_project_user_name',
        columnNames: ['user_id', 'name'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_project_user',
        columnNames: ['user_id'],
      }),
    );

    // 外键：项目 -> 用户，级联删除
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'fk_project_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // -----------------------------------------------------------------
    // 3. copies 文案表
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'copies',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
          },
          {
            name: 'project_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
            comment: '所属项目',
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: '渠道枚举: xiaohongshu/moments/ad_slogan',
          },
          {
            name: 'content',
            type: 'varchar',
            length: '1000',
            isNullable: false,
            comment: '文案内容（最多 1000 字）',
          },
          {
            name: 'is_starred',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: '是否收藏',
          },
          {
            name: 'is_edited',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: '是否被用户编辑（AI 质量代理指标）',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 项目维度查询索引（列表场景使用）
    await queryRunner.createIndex(
      'copies',
      new TableIndex({
        name: 'idx_copy_project',
        columnNames: ['project_id'],
      }),
    );
    // 渠道筛选索引（PRD 4.5.1）
    await queryRunner.createIndex(
      'copies',
      new TableIndex({
        name: 'idx_copy_channel',
        columnNames: ['channel'],
      }),
    );
    // 项目 + 创建时间复合索引，支撑列表分页排序
    await queryRunner.createIndex(
      'copies',
      new TableIndex({
        name: 'idx_copy_project_created',
        columnNames: ['project_id', 'created_at'],
      }),
    );

    // 外键：文案 -> 项目，级联删除（PRD 4.3.3）
    await queryRunner.createForeignKey(
      'copies',
      new TableForeignKey({
        name: 'fk_copy_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // -----------------------------------------------------------------
    // 4. quota_records 额度记录表
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'quota_records',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
          },
          {
            name: 'user_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
            comment: '所属用户',
          },
          {
            name: 'record_date',
            type: 'date',
            isNullable: false,
            comment: '记录日期（UTC+8 自然日）',
          },
          {
            name: 'used_count',
            type: 'int',
            unsigned: true,
            default: 0,
            isNullable: false,
            comment: '当日已使用次数',
          },
          {
            name: 'max_count',
            type: 'int',
            unsigned: true,
            default: 10,
            isNullable: false,
            comment: '当日上限（默认 10，可配置）',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 用户 + 日期唯一（保证当日单行）
    await queryRunner.createIndex(
      'quota_records',
      new TableIndex({
        name: 'uk_quota_user_date',
        columnNames: ['user_id', 'record_date'],
        isUnique: true,
      }),
    );

    // 外键：额度记录 -> 用户
    await queryRunner.createForeignKey(
      'quota_records',
      new TableForeignKey({
        name: 'fk_quota_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  /**
   * 回滚：按依赖反向顺序删除
   * 注：MySQL 在删除存在外键的表时会自动校验顺序，这里显式按子→父删除。
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quota_records', true);
    await queryRunner.dropTable('copies', true);
    await queryRunner.dropTable('projects', true);
    await queryRunner.dropTable('users', true);
  }
}
