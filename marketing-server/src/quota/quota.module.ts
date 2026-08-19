import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotaRecordEntity } from '../database/entities/quota-record.entity';
import { UserEntity } from '../database/entities/user.entity';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuotaRecordEntity, UserEntity])],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
