import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { QuotaModule } from '../quota/quota.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { SensitiveWordFilter } from './sensitive-word.filter';

/**
 * AI 模块（V2）
 *
 * 依赖：
 *   - AIProviderModule：Provider 抽象与具体实现（已升级为多模态）；
 *   - QuotaModule：额度扣减与回滚；
 *   - ConversationsModule：加载 assistant 消息上下文 + 写回结构化两版文案。
 */
@Module({
  imports: [ConfigModule, AIProviderModule, QuotaModule, ConversationsModule],
  controllers: [AIController],
  providers: [AIService, SensitiveWordFilter],
  exports: [AIService],
})
export class AIModule {}
