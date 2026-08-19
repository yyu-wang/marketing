export interface QuotaOverview {
  id: number;
  email: string;
  nickname: string;
  isActive: number;
  todayUsed: number;
  dailyLimit: number;
}

export interface SetQuotaPayload {
  dailyQuota: number;
}
