/**
 * 统一 API 客户端
 * - 读取环境变量中的后端基础地址（缺省走 vite 代理的相对路径）
 * - 自动附加鉴权 Token
 * - 解析后端统一响应结构 { code, msg, data, timestamp }
 * - 网络错误与 HTTP/业务错误统一抛出 ApiError
 */

// 默认基础地址：开发环境留空走 vite 代理；可由 VITE_API_BASE_URL 覆盖
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const TOKEN_KEY = 'xishu_access_token'
const REFRESH_TOKEN_KEY = 'xishu_refresh_token'

/* ───────── Token 存储 ───────── */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string, refreshToken?: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } catch {
    /* 忽略存储异常 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    /* 忽略 */
  }
}

/* ───────── 错误类型 ───────── */
export class ApiError extends Error {
  status: number // HTTP 状态码（网络错误为 0）
  code?: number // 业务状态码
  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** 后端统一响应结构 */
interface ApiEnvelope<T> {
  code: number
  msg: string
  data: T
  timestamp: number
}

interface RequestOptions {
  method?: string
  body?: unknown
  // 直接传入 FormData 时按 multipart 发送（不设置 Content-Type）
  formData?: FormData
  // 是否需要鉴权（默认自动附加已有 token）
  auth?: boolean
  signal?: AbortSignal
  query?: Record<string, string | number | boolean | undefined>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = `${API_BASE_URL}${path}`
  if (!query) return base
  const params = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, String(v))
  })
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * 核心请求方法，成功返回 data 字段，失败抛出 ApiError
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, query, signal } = options

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let fetchBody: BodyInit | undefined
  if (formData) {
    fetchBody = formData // 浏览器自动设置 multipart 边界
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: fetchBody, signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError('网络连接失败，请检查网络后重试', 0)
  }

  // 401：清除本地 token
  if (res.status === 401) {
    clearToken()
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!res.ok) {
    const msg = payload?.msg || `请求失败（${res.status}）`
    throw new ApiError(msg, res.status, payload?.code)
  }

  // 业务码非 200 视为失败
  if (payload && payload.code !== 200) {
    throw new ApiError(payload.msg || '请求失败', res.status, payload.code)
  }

  return (payload?.data as T) ?? (null as T)
}

/* ───────── 媒体地址处理 ───────── */
/**
 * 规整后端返回的媒体地址：
 * 将后端绝对地址中的 /cdn 等路径转为相对路径，以便走 vite 代理（开发环境）；
 * 若配置了 VITE_API_BASE_URL 则保持可访问。
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  // 已是 data URI 直接返回
  if (url.startsWith('data:')) return url
  // 提取路径部分：绝对地址取 host 后面的路径，相对地址原样
  const match = url.match(/^https?:\/\/[^/]+(\/.*)$/)
  const path = match ? match[1] : url
  if (!path.startsWith('/')) return url
  // 拼接 API 基础地址：生产环境用公网域名，开发环境留空走 vite 代理
  return `${API_BASE_URL}${path}`
}

/* ───────── 分页响应结构 ───────── */
export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  page_size: number
  pages: number
  total_solutions?: number
}
