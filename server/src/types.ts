// Cloudflare Workers 环境变量类型定义

export interface Env {
  // D1 数据库绑定
  DB: D1Database
  // JWT 密钥
  JWT_SECRET: string
  // Qwen API 配置
  QWEN_API_KEY: string
  QWEN_BASE_URL?: string
  QWEN_MODEL?: string
  // CORS 允许的源（逗号分隔）
  CORS_ORIGINS?: string
}
