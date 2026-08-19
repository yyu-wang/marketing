import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../database/entities/project.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

/**
 * Project 模块
 *
 * 导出 ProjectService 以便 AI / Copy 模块复用归属校验逻辑（findOneOrFail）。
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
