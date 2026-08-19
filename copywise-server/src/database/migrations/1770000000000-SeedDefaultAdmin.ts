import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 种子默认超级管理员
 *
 * 邮箱: admin@copywise.com
 * 密码: admin123456
 */
export class SeedDefaultAdmin1770000000000 implements MigrationInterface {
  name = 'SeedDefaultAdmin1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'admin@copywise.com' LIMIT 1`,
    );

    if (existing.length === 0) {
      await queryRunner.query(`
        INSERT INTO users (email, password_hash, role, is_active, created_at, updated_at)
        VALUES (
          'admin@copywise.com',
          '$2a$12$EpAqVP57rkYQKxtJ1quuh.TeX1uqHGAX6QKFxQhPeeVkEEO7eMaBG',
          'admin',
          1,
          NOW(),
          NOW()
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE email = 'admin@copywise.com'`);
  }
}
