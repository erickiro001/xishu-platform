import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'

// 生产环境用 VITE_API_BASE_URL，开发环境留空走 Vite 代理
const API_ORIGIN: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const BASE = `${API_ORIGIN}/api`

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * 检查响应是否为 401，若是则清除登录态并跳转登录页。
 * 返回 true 表示已处理 401，调用方应终止后续逻辑。
 */
function handleUnauthorized(res: Response): boolean {
  if (res.status === 401) {
    const auth = useAuthStore()
    auth.logout()
    router.push('/login')
    return true
  }
  return false
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
): Promise<T> {
  const auth = useAuthStore()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (handleUnauthorized(res)) {
    throw new ApiError(401, '登录已过期，请重新登录')
  }

  // 后端在出错时（如 404）可能返回非 JSON 文本，避免直接 res.json() 抛出难懂的解析错误
  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new ApiError(res.status, `请求失败 (${res.status})：${text?.slice(0, 100) || res.statusText}`)
  }

  if (json.code !== 200 && json.code !== 201) {
    throw new ApiError(json.code ?? res.status, json.msg || '请求失败')
  }
  return json.data
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  del: <T = any>(path: string) => request<T>('DELETE', path),
}

// Auth
export async function login(username: string, password: string) {
  return request<{ access_token: string; expires_in: number }>(
    'POST',
    '/auth/login',
    { username, password },
  )
}

// Upload
export async function uploadFile(file: File) {
  const auth = useAuthStore()
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE}/admin/upload`, {
    method: 'POST',
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    body: form,
  })

  if (handleUnauthorized(res)) {
    throw new ApiError(401, '登录已过期，请重新登录')
  }

  const json = await res.json()
  return json.data as { url: string; file_name: string; file_size: number }
}

/**
 * 规整媒体地址：把后端返回的绝对地址转为相对路径，
 * 以便经由 vite 代理（/cdn）加载，规避跨域 / 无法直连后端的问题。
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  // 提取路径部分：绝对地址取 host 后面的路径
  const m = url.match(/^https?:\/\/[^/]+(\/.*)$/)
  const path = m ? m[1] : url
  if (!path.startsWith('/')) return url
  // 拼接 API 基础地址：生产环境用公网域名，开发环境留空走 vite 代理
  return `${API_ORIGIN}${path}`
}

/**
 * 带鉴权下载文件：通过 fetch 携带 token 请求文件，转为 Blob URL 触发下载
 * 解决直接用 <a href download> 时不带 token 导致文件损坏的问题
 */
export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const auth = useAuthStore()
  const headers: Record<string, string> = {}
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`

  const res = await fetch(url, { headers })
  if (handleUnauthorized(res)) return
  if (!res.ok) throw new Error(`下载失败 (${res.status})`)

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放，确保下载已触发
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}
