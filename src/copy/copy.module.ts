import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyEntity } from '../database/entities/copy.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { CopyController } from './copy.controller';
import { CopyService } from './copy.service';

/**
 * Copy 模块
 *
 * 暴露 CopyService 供 AnalyticsModule 复用聚合查询。
 */
@Module({
  imports: [TypeOrmModule.forFeature([CopyEntity, MessageEntity, ProjectEntity])],
  controllers: [CopyController],
  providers: [CopyService],
  exports: [CopyService],
})
export class CopyModule {}
