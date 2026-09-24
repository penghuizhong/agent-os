// AI Brain 模块 - 使用 pi-ai 进行 LLM 流式调用
// 适配 Cloudflare Workers: 所有 DB 操作异步，配置从 env 读取
import { createModels, createProvider, envApiKeyAuth, type Model } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { agentOps, messageOps, memoryOps, type UserAgent, type Message, type Memory } from './database'

type EventCallback = (delta: string) => void
type ThinkingCallback = (delta: string) => void

interface ChatContext {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class PiBrain {
  private db: D1Database
  private env: Env
  private models: ReturnType<typeof createModels> | null = null
  private model: Model<any> | null = null
  private available = false
  private apiKey: string

  constructor(db: D1Database, env: Env) {
    this.db = db
    this.env = env
    this.apiKey = env.QWEN_API_KEY || ''
  }

  async init(): Promise<void> {
    if (!this.apiKey) {
      console.log('[pi] No QWEN_API_KEY found. Running in mock mode.')
      this.available = false
      return
    }

    const baseUrl = this.env.QWEN_BASE_URL || 'https://maas.qianwenaiapi.com/compatible-mode/v1'
    const modelId = this.env.QWEN_MODEL || 'qwen3.8-flash'

    try {
      const qwen = createProvider({
        id: 'qwen',
        name: 'Qwen',
        baseUrl,
        auth: { apiKey: envApiKeyAuth('Qwen API Key', ['QWEN_API_KEY']) },
        api: openAICompletionsApi(),
        models: [{
          id: modelId,
          name: 'Qwen 3.8 Flash',
          api: 'openai-completions',
          provider: 'qwen',
          baseUrl,
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 1000000,
          maxTokens: 8192,
        }],
      })

      this.models = createModels()
      this.models.setProvider(qwen)
      this.model = this.models.getModel('qwen', modelId) ?? null

      if (!this.model) {
        console.log('[pi] Failed to get model from runtime')
        this.available = false
        return
      }

      this.available = true
      console.log(`[pi] Connected via pi-ai (direct streaming)`)
      console.log(`[pi] Model: ${this.model.id}, Provider: ${this.model.provider}`)
    } catch (err: any) {
      console.log(`[pi] Init failed: ${err?.message ?? err}`)
      this.available = false
    }
  }

  isAvailable(): boolean {
    return this.available
  }

  // 获取用户的 Agent 列表
  async getUserAgents(userId: string): Promise<UserAgent[]> {
    return agentOps.findByUser(this.db, userId)
  }

  // 获取单个 Agent（验证所属权）
  async getAgent(agentId: string, userId: string): Promise<UserAgent | null> {
    return agentOps.findById(this.db, agentId, userId)
  }

  // 获取会话历史
  async getHistory(agentId: string, userId: string, limit = 50): Promise<Message[]> {
    return messageOps.findByAgent(this.db, userId, agentId, limit)
  }

  // 获取记忆
  async getMemories(agentId: string, userId: string): Promise<Memory[]> {
    return memoryOps.findByAgent(this.db, userId, agentId)
  }

  // 获取用户 Agent 的会话历史
  async getChatHistory(userId: string, agentId: string, limit = 50): Promise<Message[]> {
    return messageOps.findByAgent(this.db, userId, agentId, limit)
  }

  // 获取用户记忆
  async getUserMemories(userId: string, agentId?: string): Promise<Memory[]> {
    if (agentId) {
      return memoryOps.findByAgent(this.db, userId, agentId)
    }
    return memoryOps.findByUser(this.db, userId)
  }

  // 添加记忆
  async addMemory(userId: string, agentId: string | null, content: string, tags: string[] = [], importance = 0) {
    return memoryOps.create(this.db, userId, agentId, content, tags, importance)
  }

  // 构建对话上下文
  private async buildContext(userId: string, agent: UserAgent, newMessage: string): Promise<ChatContext[]> {
    const context: ChatContext[] = []

    // 1. 系统提示
    context.push({ role: 'system', content: agent.system_prompt })

    // 2. 添加相关记忆
    const memories = await memoryOps.findByAgent(this.db, userId, agent.id)
    if (memories.length > 0) {
      const memoryText = memories
        .slice(0, 10)
        .map(m => `- ${m.content}`)
        .join('\n')
      context.push({
        role: 'system',
        content: `以下是你记得的关于用户的重要信息：\n${memoryText}`,
      })
    }

    // 3. 添加历史消息
    const history = await messageOps.findByAgent(this.db, userId, agent.id, 20)
    for (const msg of history) {
      context.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    // 4. 添加新消息
    context.push({ role: 'user', content: newMessage })

    return context
  }

  // 发送消息并获取响应
  async prompt(
    userId: string,
    agentId: string,
    message: string,
    onDelta: EventCallback,
    onThinking?: ThinkingCallback,
  ): Promise<string> {
    if (!this.models || !this.model) {
      throw new Error('PiBrain not initialized')
    }

    const agent = await agentOps.findById(this.db, agentId, userId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for user ${userId}`)
    }

    // 保存用户消息
    await messageOps.create(this.db, userId, agentId, 'user', message)

    // 更新 Agent 状态
    await agentOps.updateStatus(this.db, agentId, userId, 'thinking')

    // 构建上下文
    const context = await this.buildContext(userId, agent, message)

    let fullText = ''
    let thinkingText = ''

    try {
      console.log(`[pi] Streaming request for user ${userId}, agent ${agentId} (${agent.name})`)

      const response = await this.models.stream(this.model, { messages: context } as any, {
        apiKey: this.apiKey,
      })

      // 处理流式响应
      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        for await (const event of response as AsyncIterable<any>) {
          if (event?.type === 'text-delta' || event?.type === 'text_delta') {
            const delta = event.delta || event.text || ''
            if (delta) {
              fullText += delta
              onDelta(delta)
            }
          } else if (event?.type === 'thinking-delta' || event?.type === 'thinking_delta') {
            const delta = event.delta || event.thinking || ''
            if (delta && onThinking) {
              thinkingText += delta
              onThinking(delta)
            }
          }
        }
      } else if (response && typeof response === 'object') {
        const msg = response as any
        if (msg?.content) {
          if (typeof msg.content === 'string') {
            fullText = msg.content
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text' && part.text) {
                fullText += part.text
              } else if (part.type === 'thinking' && (part.thinking || part.text)) {
                thinkingText += part.thinking || part.text
              }
            }
          }
        }
      }

      // 尝试从响应对象提取内容
      if (!fullText && response) {
        const raw = response as any
        if (raw?.text) fullText = raw.text
        else if (raw?.message?.content) fullText = typeof raw.message.content === 'string' ? raw.message.content : JSON.stringify(raw.message.content)
        else if (raw?.choices?.[0]?.message?.content) fullText = raw.choices[0].message.content
      }

    } catch (err: any) {
      console.error(`[pi] Stream error: ${err?.message ?? err}`)
      fullText = `[错误] ${err?.message ?? '请求失败'}`
    }

    // 保存助手响应
    if (fullText) {
      await messageOps.create(this.db, userId, agentId, 'assistant', fullText, thinkingText || null)
    }

    // 更新 Agent 状态
    await agentOps.updateStatus(this.db, agentId, userId, 'idle')

    // 自动提取记忆（异步，不阻塞响应）
    this.extractMemories(userId, agentId, message, fullText).catch(err => {
      console.error('[pi] Memory extraction failed:', err)
    })

    console.log(`[pi] Response complete: ${fullText.length} chars, thinking: ${thinkingText.length} chars`)
    return fullText
  }

  // 自动提取记忆
  private async extractMemories(userId: string, agentId: string, userMessage: string, assistantResponse: string) {
    if (!this.models || !this.model) return

    const combinedText = `${userMessage}\n${assistantResponse}`
    if (combinedText.length < 20) return

    const existingMemories = await memoryOps.findByAgent(this.db, userId, agentId)
    if (existingMemories.length >= 50) return

    try {
      const extractPrompt = [
        {
          role: 'system' as const,
          content: `你是一个记忆提取助手。分析以下对话，提取出值得长期记住的关键信息。
只提取以下类型的信息：
1. 用户的个人偏好或习惯
2. 项目相关的重要决策或结论
3. 用户提到的具体数据、日期、名称
4. 重要的需求或约束条件

如果没有值得记住的信息，返回空数组。
返回 JSON 格式：[{"content": "记忆内容", "tags": ["标签1", "标签2"], "importance": 1-5}]
importance 1=普通信息, 5=极其重要。最多返回3条记忆。只返回JSON，不要其他文字。`,
        },
        {
          role: 'user' as const,
          content: `用户说：${userMessage}\n助手回复：${assistantResponse.slice(0, 500)}`,
        },
      ]

      const response = await this.models.stream(this.model, { messages: extractPrompt } as any, {
        apiKey: this.apiKey,
      })

      let responseText = ''
      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        for await (const event of response as AsyncIterable<any>) {
          if (event?.type === 'text-delta' || event?.type === 'text_delta') {
            responseText += event.delta || event.text || ''
          }
        }
      } else if (response) {
        const raw = response as any
        responseText = raw?.text || raw?.content || raw?.message?.content || ''
        if (Array.isArray(responseText)) {
          responseText = responseText.map((p: any) => p.text || '').join('')
        }
      }

      // 解析 JSON 响应
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0])
        for (const mem of memories) {
          if (mem.content && mem.content.length > 5) {
            await memoryOps.create(
              this.db,
              userId,
              agentId,
              mem.content,
              mem.tags || [],
              mem.importance || 1,
            )
            console.log(`[pi] Memory extracted: ${mem.content.slice(0, 50)}...`)
          }
        }
      }
    } catch (err: any) {
      console.error('[pi] Memory extraction error:', err?.message ?? err)
    }
  }

  // 清除会话历史
  async clearHistory(userId: string, agentId: string) {
    await messageOps.deleteByAgent(this.db, userId, agentId)
  }

  // 创建新 Agent
  async createAgent(userId: string, name: string, role: string, description: string, avatar: string, tags: string[] = []): Promise<UserAgent> {
    const systemPrompt = `你是 NEXUS AI 的 ${name}（${role}）。${description}。回答风格：专业、简洁、有条理，用中文回答。`
    return agentOps.create(this.db, userId, name, role, description, systemPrompt, avatar, tags)
  }

  // 删除 Agent
  async deleteAgent(userId: string, agentId: string) {
    await agentOps.delete(this.db, agentId, userId)
    await messageOps.deleteByAgent(this.db, userId, agentId)
  }
}
