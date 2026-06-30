import { CHANNEL_LABEL, CopyChannel } from '@/types/copy'

export interface ChannelOption {
  value: CopyChannel
  label: string
}

export const CHANNEL_OPTIONS: ChannelOption[] = [
  { value: CopyChannel.XIAOHONGSHU, label: CHANNEL_LABEL[CopyChannel.XIAOHONGSHU] },
  { value: CopyChannel.MOMENTS, label: CHANNEL_LABEL[CopyChannel.MOMENTS] },
  { value: CopyChannel.AD_SLOGAN, label: CHANNEL_LABEL[CopyChannel.AD_SLOGAN] },
]

export const channelLabel = (channel: CopyChannel): string => CHANNEL_LABEL[channel] ?? channel
