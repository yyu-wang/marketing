import type { Message } from '@/types/conversation'
import { formatDateTime } from './format'

export const exportConversation = (title: string, messages: Message[]): string => {
  const lines: string[] = [`# ${title}`, '', `> 导出时间：${formatDateTime(new Date().toISOString())}`, '']

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 助手'
    const time = formatDateTime(msg.createdAt)
    lines.push(`### ${roleLabel}（${time}）`, '')

    if (msg.content) {
      lines.push(msg.content, '')
    }

    if (msg.imageUrls && msg.imageUrls.length > 0) {
      lines.push('**图片附件：**', '')
      for (const url of msg.imageUrls) {
        lines.push(`- [查看图片](${url})`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export const downloadMarkdown = (title: string, content: string): void => {
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${title}-${dateStr}.md`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
