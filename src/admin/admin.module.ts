import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../database/entities/user.entity';
import { PromptTemplateEntity } from '../database/entities/prompt-template.entity';
import { AdminGuard } from './admin.guard';
import { UserManagementController } from './user-management/user-management.controller';
import { UserManagementService } from './user-management/user-management.service';
import { TemplateController } from './template-management/template.controller';
import { TemplateService } from './template-management/template.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([UserEntity, PromptTemplateEntity]),
  ],
  controllers: [UserManagementController, TemplateController],
  providers: [UserManagementService, TemplateService, AdminGuard],
})
export class AdminModule {}
