import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { QuotaService } from './quota.service';

/**
 * 额度控制器
 *
 * 路由前缀：/api/quota
 * 对应 PRD 9.1：GET /api/quota/today —— 获取今日剩余次数。
 */
@ApiTags('Quota')
@ApiBearerAuth('JWT')
@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * GET /api/quota/today
   * 返回：{ remaining, used, max }
   * 前端用于顶部"今日剩余：X/10"展示（PRD 4.7.2）。
   */
  @Get('today')
  @ApiOperation({
    summary: '获取今日剩余生成次数',
    description: 'PRD 4.7.2：返回 remaining/used/max，UTC+8 自然日重置。',
  })
  getToday(@CurrentUser() user: JwtPayload) {
    return this.quotaService.getTodayRemaining(user.sub);
  }
}
