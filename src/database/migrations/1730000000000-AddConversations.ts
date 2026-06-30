import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * 新增 conversations / messages 两张表
 *
 * 对应 V2 业务模型：对话式图文创作。
 * 旧的 projects / copies / quota_records / users 表保持不变。
 */
export class AddConversations1730000000000 implements MigrationInterface {
  name = 'AddConversations1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -----------------------------------------------------------------
    // conversations
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
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
            name: 'title',
            type: 'varchar',
            length: '60',
            isNullable: false,
            comment: '对话标题（默认取首条用户消息前 30 字）',
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

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'idx_conv_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        name: 'fk_conv_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // -----------------------------------------------------------------
    // messages
    // -----------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'messages',
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
            name: 'conversation_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '16',
            isNullable: false,
            comment: 'user | assistant',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'xiaohongshu',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'moments',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            isNullable: false,
            default: "'done'",
            comment: 'pending|streaming|done|error',
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

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_msg_conv',
        columnNames: ['conversation_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        name: 'fk_msg_conv',
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages', true);
    await queryRunner.dropTable('conversations', true);
  }
}
