import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

/**
 * Quota 模块
 *
 * 暴露：QuotaController（HTTP 接口）+ QuotaService（供 AI 模块复用）。
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([QuotaRecordEntity])],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
