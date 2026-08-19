import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserDailyQuota1810000000000 implements MigrationInterface {
  name = 'AddUserDailyQuota1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'daily_quota',
        type: 'int',
        unsigned: true,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'daily_quota');
  }
}
