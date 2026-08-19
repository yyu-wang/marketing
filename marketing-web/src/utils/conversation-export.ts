import dayjs from 'dayjs'
import type { Message } from '@/types/conversation'

/**
 * 将对话消息序列化为 Markdown 字符串。
 * 跳过生成中的消息（pending/streaming），避免导出半成品内容。
 */
export function exportConversation(messages: Message[], title: string): string {
  const finalized = messages.filter(
    (m) => m.status !== 'pending' && m.status !== 'streaming',
  )

  const lines: string[] = [
    `# ${title}`,
    '',
    `> 导出时间：${dayjs().format('YYYY-MM-DD HH:mm')}`,
    '> 来源：Marketing Wise 智能营销文案助手',
    '',
    '---',
    '',
  ]

  for (const msg of finalized) {
    const role = msg.role === 'user' ? '👤 用户' : '🤖 AI 助手'
    lines.push(`## ${role} · ${dayjs(msg.createdAt).format('YYYY-MM-DD HH:mm')}`, '')
    if (msg.imageUrls?.length) {
      lines.push(`> 📷 包含 ${msg.imageUrls.length} 张图片`, '')
    }
    lines.push(msg.content || '', '---', '')
  }

  return lines.join('\n')
}

/** 生成导出文件名 `{title}-{YYYY-MM-DD}.md`，非法文件名字符替换为 - */
export function buildExportFilename(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '-').trim() || '对话'
  return `${safe}-${dayjs().format('YYYY-MM-DD')}.md`
}

/** 通过 Blob + URL.createObjectURL 触发浏览器下载 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
