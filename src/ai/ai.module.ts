import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyEntity } from '../database/entities/copy.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { QuotaModule } from '../quota/quota.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { SensitiveWordFilter } from './sensitive-word.filter';

/**
 * AI 模块
 *
 * 依赖：
 *   - AIProviderModule：Provider 抽象与具体实现；
 *   - QuotaModule：额度扣减与回滚；
 *   - TypeOrm(Project/Copy)：归属校验 + 入库。
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ProjectEntity, CopyEntity]),
    AIProviderModule,
    QuotaModule,
  ],
  controllers: [AIController],
  providers: [AIService, SensitiveWordFilter],
  exports: [AIService],
})
export class AIModule {}
