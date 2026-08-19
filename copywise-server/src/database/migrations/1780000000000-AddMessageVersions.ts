import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddMessageVersions1780000000000 implements MigrationInterface {
  name = 'AddMessageVersions1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'message_versions',
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
            name: 'message_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
            comment: '关联消息 ID',
          },
          {
            name: 'version',
            type: 'int',
            unsigned: true,
            default: 1,
            isNullable: false,
            comment: '版本号',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
            comment: '该版本的内容',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'message_versions',
      new TableIndex({
        name: 'idx_mv_message',
        columnNames: ['message_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'message_versions',
      new TableForeignKey({
        name: 'fk_mv_message',
        columnNames: ['message_id'],
        referencedTableName: 'messages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('message_versions', 'fk_mv_message');
    await queryRunner.dropIndex('message_versions', 'idx_mv_message');
    await queryRunner.dropTable('message_versions', true);
  }
}
