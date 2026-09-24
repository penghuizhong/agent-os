// 认证模块 - 适配 Cloudflare Workers
// bcryptjs (纯JS密码哈希) + jose (Web Crypto JWT)
import bcrypt from 'bcryptjs'
import * as jose from 'jose'
import type { Context, MiddlewareHandler } from 'hono'
import { userOps, agentOps, generateId, type User } from './database'

// JWT Payload
export interface JwtPayload {
  userId: string
  username: string
}

const JWT_EXPIRES_IN = '7d'
const SALT_ROUNDS = 10

// 获取 JWT 密钥 (从环境变量)
function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || 'nexus-ai-secret-key-change-in-production'
}

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// 生成 JWT Token
export async function generateToken(user: User, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret(env))
  const token = await new jose.SignJWT({
    userId: user.id,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret)
  return token
}

// 验证 Token
export async function verifyToken(token: string, env: Env): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret(env))
    const { payload } = await jose.jwtVerify(token, secret)
    return {
      userId: payload.userId as string,
      username: payload.username as string,
    }
  } catch {
    return null
  }
}

// Hono JWT 认证中间件
export function authMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: '未提供认证令牌' }, 401)
    }

    const token = authHeader.slice(7)
    const payload = await verifyToken(token, c.env as Env)
    if (!payload) {
      return c.json({ error: '认证令牌无效或已过期' }, 401)
    }

    // 将用户信息存入 context
    c.set('user', payload)
    await next()
  }
}

// 从 context 获取认证用户
export function getAuthUser(c: Context): JwtPayload {
  return c.get('user') as JwtPayload
}

// ============ Auth Service ============

export interface RegisterInput {
  username: string
  password: string
  email?: string
  avatar?: string
}

export interface LoginInput {
  username: string
  password: string
}

export interface AuthResult {
  success: boolean
  token?: string
  user?: {
    id: string
    username: string
    email: string | null
    avatar: string
  }
  error?: string
}

// 默认 Agent 配置
const DEFAULT_AGENTS = [
  { name: 'Fashion Director', role: '服装设计总监', description: '专注于服装设计方向决策与趋势分析', avatar: 'F', tags: ['设计', '趋势'] },
  { name: 'Trend Researcher', role: '趋势研究员', description: '分析时尚趋势与市场动向', avatar: 'T', tags: ['研究', '数据'] },
  { name: 'Design Creator', role: '设计师', description: '生成设计方案与视觉创意', avatar: 'D', tags: ['创意', '视觉'] },
  { name: 'Marketing Specialist', role: '营销专家', description: '制定营销策略与推广方案', avatar: 'M', tags: ['营销', '策略'] },
  { name: 'Developer', role: '开发工程师', description: 'AI 工作台性能优化与功能开发', avatar: 'V', tags: ['开发', '技术'] },
  { name: 'Market Analyst', role: '市场分析师', description: '市场数据分析与竞品研究', avatar: 'A', tags: ['分析', '竞品'] },
  { name: 'Content Creator', role: '内容创作者', description: '内容策划与文案撰写', avatar: 'C', tags: ['内容', '文案'] },
]

// 为新用户创建默认 Agent
async function createDefaultAgents(db: D1Database, userId: string) {
  for (const agent of DEFAULT_AGENTS) {
    const systemPrompt = `你是 NEXUS AI 的 ${agent.name}（${agent.role}）。${agent.description}。回答风格：专业、简洁、有条理，用中文回答。`
    await agentOps.create(db, userId, agent.name, agent.role, agent.description, systemPrompt, agent.avatar, agent.tags)
  }
}

export const authService = {
  // 注册
  async register(db: D1Database, input: RegisterInput, env: Env): Promise<AuthResult> {
    const { username, password, email, avatar } = input

    if (!username || username.length < 3) {
      return { success: false, error: '用户名至少需要3个字符' }
    }
    if (!password || password.length < 6) {
      return { success: false, error: '密码至少需要6个字符' }
    }

    const existingUser = await userOps.findByUsername(db, username)
    if (existingUser) {
      return { success: false, error: '用户名已被注册' }
    }

    if (email) {
      const existingEmail = await userOps.findByEmail(db, email)
      if (existingEmail) {
        return { success: false, error: '邮箱已被注册' }
      }
    }

    try {
      const passwordHash = await hashPassword(password)
      const user = await userOps.create(db, username, email || null, passwordHash, avatar || username[0].toUpperCase())

      await createDefaultAgents(db, user.id)

      const token = await generateToken(user, env)

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        },
      }
    } catch (err: any) {
      console.error('[auth] Register error:', err)
      return { success: false, error: '注册失败，请稍后重试' }
    }
  },

  // 登录
  async login(db: D1Database, input: LoginInput, env: Env): Promise<AuthResult> {
    const { username, password } = input

    const user = await userOps.findByUsername(db, username)
    if (!user) {
      return { success: false, error: '用户名或密码错误' }
    }

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return { success: false, error: '用户名或密码错误' }
    }

    const token = await generateToken(user, env)

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    }
  },

  // 获取当前用户信息
  async getCurrentUser(db: D1Database, userId: string) {
    const user = await userOps.findById(db, userId)
    if (!user) return null
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.created_at,
    }
  },
}
