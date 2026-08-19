import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { QuotaService } from './quota.service';

@ApiTags('Quota')
@ApiBearerAuth('JWT')
@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get('status')
  @ApiOperation({ summary: '查询今日额度使用情况' })
  async status(@CurrentUser() user: JwtPayload) {
    const { usedCount, dailyLimit } = await this.quotaService.getTodayUsage(user.sub);
    return { todayUsed: usedCount, dailyLimit, remaining: Math.max(0, dailyLimit - usedCount) };
  }
}
