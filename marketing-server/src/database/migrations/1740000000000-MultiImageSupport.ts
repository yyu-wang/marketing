import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiImageSupport1740000000000 implements MigrationInterface {
  name = 'MultiImageSupport1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 新增 image_urls (text) 列
    await queryRunner.query(
      `ALTER TABLE messages ADD COLUMN image_urls TEXT NULL AFTER image_url`,
    );

    // 2. 将现有 image_url 数据迁移为 JSON 数组格式
    await queryRunner.query(
      `UPDATE messages SET image_urls = JSON_ARRAY(image_url) WHERE image_url IS NOT NULL`,
    );

    // 3. 删除旧列
    await queryRunner.query(
      `ALTER TABLE messages DROP COLUMN image_url`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：重新加回 image_url
    await queryRunner.query(
      `ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL AFTER image_urls`,
    );

    // 取 JSON 数组的第一个元素回填
    await queryRunner.query(
      `UPDATE messages SET image_url = JSON_UNQUOTE(JSON_EXTRACT(image_urls, '$[0]')) WHERE image_urls IS NOT NULL`,
    );

    // 删除 image_urls
    await queryRunner.query(
      `ALTER TABLE messages DROP COLUMN image_urls`,
    );
  }
}
