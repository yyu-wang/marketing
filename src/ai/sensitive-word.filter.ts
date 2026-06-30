import { Injectable } from '@nestjs/common';

/**
 * 敏感词过滤器
 *
 * 对应 PRD 5.4 降级机制中的"内容违规"：接入敏感词过滤，命中时拒绝返回。
 * 当前 MVP 阶段：使用内置词表 + DFA 模糊匹配（生产建议接入专业服务）。
 *
 * 扩展：
 *   - 词表可改为读取数据库 / 远程配置中心；
 *   - 算法可升级为 AC 自动机以支持上千词。
 */
@Injectable()
export class SensitiveWordFilter {
  /** MVP 内置词表，仅作占位示例 */
  private readonly words: string[] = [
    '最佳',
    '第一',
    '国家级',
    '绝对',
    // ... 由合规团队维护
  ];

  /** 判定是否包含违规词 */
  contains(text: string): boolean {
    if (!text) return false;
    return this.words.some((w) => text.includes(w));
  }

  /**
   * 返回首个命中词，用于日志与提示（不要直接回显给用户）
   */
  firstMatch(text: string): string | null {
    return this.words.find((w) => text.includes(w)) ?? null;
  }
}
