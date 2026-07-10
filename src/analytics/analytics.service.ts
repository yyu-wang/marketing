import { Injectable } from '@nestjs/common';
import { CopyChannel } from '../database/entities/copy.entity';
import { CopyService } from '../copy/copy.service';

export interface AnalyticsOverview {
  channelDistribution: Array<{ channel: CopyChannel; count: number; ratio: number }>;
  topStarred: Array<{ copyId: number; summary: string; channel: CopyChannel }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

@Injectable()
export class AnalyticsService {
  private readonly SUMMARY_LEN = 30;

  constructor(private readonly copyService: CopyService) {}

  /**
   * 获取看板聚合数据
   */
  async overview(userId: number): Promise<AnalyticsOverview> {
    const [channelMap, top, trend] = await Promise.all([
      this.copyService.aggregateByChannel(userId),
      this.copyService.topStarred(userId, 5),
      this.copyService.dailyTrend(userId, 7),
    ]);

    // 渠道占比：将原始计数转为带百分比的数组
    const total = Object.values(channelMap).reduce((a, b) => a + b, 0);
    const channelDistribution = (Object.keys(channelMap) as CopyChannel[]).map(
      (channel) => {
        const count = channelMap[channel];
        return {
          channel,
          count,
          ratio: total === 0 ? 0 : Number((count / total).toFixed(4)),
        };
      },
    );

    // TOP N 收藏（截取摘要展示，避免响应过大）
    const topStarred = top.map((c) => ({
      copyId: Number(c.id),
      channel: c.channel,
      summary:
        c.content.length > this.SUMMARY_LEN
          ? `${c.content.slice(0, this.SUMMARY_LEN)}…`
          : c.content,
    }));

    // 7 日趋势：补齐缺失日期（保证图表 X 轴连续）
    const dailyTrend = this.fillMissingDays(trend, 7);

    return { channelDistribution, topStarred, dailyTrend };
  }

  /**
   * 把数据库返回的稀疏日期数组补齐为连续 N 天
   * 缺失天数用 count=0 填充。
   */
  private fillMissingDays(
    rows: Array<{ date: string; count: number }>,
    days: number,
  ): Array<{ date: string; count: number }> {
    const map = new Map(rows.map((r) => [r.date, r.count]));
    const result: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10); // yyyy-MM-dd
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }
}
