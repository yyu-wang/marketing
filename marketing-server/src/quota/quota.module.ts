import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuotaRecordEntity])],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
