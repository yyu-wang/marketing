import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserNickname1800000000000 implements MigrationInterface {
  name = 'AddUserNickname1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'nickname',
        type: 'varchar',
        length: '20',
        default: "''",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'nickname');
  }
}
