import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserContentToVersions1810000000000 implements MigrationInterface {
  name = 'AddUserContentToVersions1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'message_versions',
      new TableColumn({
        name: 'user_content',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('message_versions', 'user_content');
  }
}
