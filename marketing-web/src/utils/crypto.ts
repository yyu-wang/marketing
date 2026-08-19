/**
 * SHA-256 哈希工具
 *
 * 使用 Web Crypto API 对密码做客户端哈希，再通过 HTTPS 传输，
 * 确保服务端永远不接触明文密码。
 */

export async function sha256(message: string): Promise<string> {
  if (!crypto?.subtle) {
    throw new Error('当前环境不支持安全加密，请使用 HTTPS 访问')
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
