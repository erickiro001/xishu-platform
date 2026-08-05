/**
 * 认证服务：登录、登出、Token 管理
 */
import { request, setToken, clearToken, getToken, ApiError } from './api'

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export async function login(username: string, password: string): Promise<void> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  if (!data?.access_token) {
    throw new ApiError('登录失败：未获取到访问令牌', 0)
  }
  setToken(data.access_token, data.refresh_token)
}

export async function logout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } catch {
    // 即使后端登出失败也清除本地 token
  } finally {
    clearToken()
  }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
