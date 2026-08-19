import { Module } from '@nestjs/common';
import { CopyModule } from '../copy/copy.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics 模块
 *
 * 复用 CopyService 的聚合查询逻辑，自身仅做组装与展示加工。
 */
@Module({
  imports: [CopyModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
