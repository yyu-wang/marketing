import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

/**
 * 数据看板控制器
 *
 * 路由前缀：/api/analytics
 * 对应 PRD 9.1：GET /api/analytics/overview
 */
@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics/overview
   * 返回看板首屏所需的聚合数据：渠道占比 / 收藏排行 / 7 日趋势。
   */
  @Get('overview')
  @ApiOperation({
    summary: '数据看板概览',
    description:
      'PRD 4.6：返回渠道占比、收藏排行 Top、7 日生成趋势（含填充缺失日期）。',
  })
  overview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.overview(user.sub);
  }
}
