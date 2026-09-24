// 生产环境前后端同源，使用相对路径；开发环境由 Vite proxy 转发
const API_BASE = import.meta.env.VITE_API_URL || ''

// Token 管理
const TOKEN_KEY = 'nexus_token'
const USER_KEY = 'nexus_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): { id: string; username: string; email: string | null; avatar: string } | null {
  const stored = localStorage.getItem(USER_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {}
  }
  return null
}

export function setStoredUser(user: { id: string; username: string; email: string | null; avatar: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// API 请求封装
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearToken()
    throw new Error('认证已过期，请重新登录')
  }

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data
}

// ============ Auth API ============

export interface AuthResponse {
  success: boolean
  token: string
  user: { id: string; username: string; email: string | null; avatar: string }
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  setStoredUser(data.user)
  return data
}

export async function register(username: string, password: string, email?: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, email }),
  })
  setToken(data.token)
  setStoredUser(data.user)
  return data
}

export async function getCurrentUser() {
  return request<{ id: string; username: string; email: string | null; avatar: string; createdAt: string }>('/api/auth/me')
}

export function logout() {
  clearToken()
}

// ============ Agent API ============

export interface Agent {
  id: string
  name: string
  role: string
  description: string | null
  avatar: string
  tags: string[]
  status: string
}

export async function getAgents(): Promise<Agent[]> {
  return request('/api/agents')
}

export async function createAgent(data: { name: string; role: string; description?: string; avatar?: string; tags?: string[] }): Promise<Agent> {
  return request('/api/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteAgent(id: string): Promise<void> {
  return request(`/api/agents/${id}`, { method: 'DELETE' })
}

// ============ History API ============

export interface ChatHistoryItem {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking: string | null
  created_at: string
}

export async function getChatHistory(agentId: string): Promise<ChatHistoryItem[]> {
  return request(`/api/agents/${agentId}/history`)
}

export async function clearChatHistory(agentId: string): Promise<void> {
  return request(`/api/agents/${agentId}/history`, { method: 'DELETE' })
}

// ============ Memory API ============

export interface Memory {
  id: string
  agent_id: string | null
  content: string
  tags: string | null
  importance: number
  created_at: string
}

export async function getMemories(agentId: string): Promise<Memory[]> {
  return request(`/api/agents/${agentId}/memories`)
}

// ============ Chat API (SSE) ============

export async function sendMessage(
  agentId: string,
  message: string,
  onDelta: (delta: string) => void,
  onThinking: (delta: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
): Promise<AbortController> {
  const controller = new AbortController()
  const token = getToken()

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ agentId, message }),
    signal: controller.signal,
  })

  if (!res.ok) {
    try {
      const data = await res.json()
      onError(data.error || '请求失败')
    } catch {
      onError(`请求失败 (${res.status})`)
    }
    return controller
  }

  const reader = res.body?.getReader()
  if (!reader) {
    onError('无法读取响应流')
    return controller
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (currentEvent === 'chunk') {
            onDelta(data.text || '')
          } else if (currentEvent === 'done') {
            onDone(data.text || '')
          } else if (currentEvent === 'error') {
            onError(data.message || '未知错误')
          }
        } catch {}
        currentEvent = ''
      } else if (line.trim() === '') {
        currentEvent = ''
      }
    }
  }

  return controller
}
