import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

export const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

export const formatDate = (value?: string): string => {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD')
}

export const truncate = (value: string, max = 80): string => {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}...` : value
}

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
    return true
  } catch {
    ElMessage.error('复制失败，请手动复制')
    return false
  }
}
