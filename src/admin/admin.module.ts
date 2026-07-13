import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SensitiveWordEntity } from '../database/entities/sensitive-word.entity';
import { UserEntity } from '../database/entities/user.entity';
import { PromptTemplateEntity } from '../database/entities/prompt-template.entity';
import { SensitiveWordFilter } from '../ai/sensitive-word.filter';
import { AdminGuard } from './admin.guard';
import { SensitiveWordController } from './sensitive-word/sensitive-word.controller';
import { SensitiveWordService } from './sensitive-word/sensitive-word.service';
import { UserManagementController } from './user-management/user-management.controller';
import { UserManagementService } from './user-management/user-management.service';
import { TemplateController } from './template-management/template.controller';
import { TemplateService } from './template-management/template.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([UserEntity, PromptTemplateEntity, SensitiveWordEntity]),
  ],
  controllers: [
    UserManagementController,
    TemplateController,
    SensitiveWordController,
  ],
  providers: [
    UserManagementService,
    TemplateService,
    SensitiveWordService,
    SensitiveWordFilter,
    AdminGuard,
  ],
})
export class AdminModule {}
