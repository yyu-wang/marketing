import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * 性能索引补充：覆盖高频查询模式
 *   - messages: (conversation_id, role, id)  → loadAssistantContext 查询
 *   - conversations: (user_id, updated_at)  → 侧边栏列表排序
 */
export class AddPerformanceIndexes1750000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_msg_conv_role_id',
        columnNames: ['conversation_id', 'role', 'id'],
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'idx_conv_user_updated',
        columnNames: ['user_id', 'updated_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('messages', 'idx_msg_conv_role_id');
    await queryRunner.dropIndex('conversations', 'idx_conv_user_updated');
  }
}
