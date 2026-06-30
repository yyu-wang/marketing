export enum CopyChannel {
  XIAOHONGSHU = 'xiaohongshu',
  MOMENTS = 'moments',
  AD_SLOGAN = 'ad_slogan',
}

export const CHANNEL_LABEL: Record<CopyChannel, string> = {
  [CopyChannel.XIAOHONGSHU]: '小红书',
  [CopyChannel.MOMENTS]: '朋友圈',
  [CopyChannel.AD_SLOGAN]: '广告语',
}

export const CHANNEL_COLOR: Record<CopyChannel, string> = {
  [CopyChannel.XIAOHONGSHU]: '#ff4d6d',
  [CopyChannel.MOMENTS]: '#4caf50',
  [CopyChannel.AD_SLOGAN]: '#409eff',
}

export interface Copy {
  id: number
  projectId: number
  channel: CopyChannel
  content: string
  isStarred: boolean
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface ListCopiesQuery {
  channel?: CopyChannel
  order?: 'asc' | 'desc'
}

export interface UpdateCopyPayload {
  content: string
}

export interface ToggleStarPayload {
  isStarred?: boolean
}
