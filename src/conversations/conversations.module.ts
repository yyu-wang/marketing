import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { MessageVersionEntity } from '../database/entities/message-version.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity, MessageVersionEntity])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService, TypeOrmModule],
})
export class ConversationsModule {}
