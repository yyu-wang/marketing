import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { QuotaModule } from '../quota/quota.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  imports: [ConfigModule, AIProviderModule, ConversationsModule, QuotaModule],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
