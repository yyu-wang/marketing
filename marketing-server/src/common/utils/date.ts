/** 东八区（中国标准时间）偏移，用于把本机时间归一化到 UTC+8 的"今天" */
export const UTC8_OFFSET_MS = 8 * 3600 * 1000;

/** 返回 UTC+8 的当天日期字符串（YYYY-MM-DD），作为额度记录的分区键 */
export function getTodayKey(date: Date = new Date()): string {
  const utc8 = new Date(date.getTime() + UTC8_OFFSET_MS);
  return utc8.toISOString().slice(0, 10);
}
