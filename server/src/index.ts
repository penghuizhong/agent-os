import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface ChatRequest {
  agentId: string
  message: string
}

interface AgentConfig {
  name: string
  systemPrompt: string
}

const agentConfigs: Record<string, AgentConfig> = {
  '1': {
    name: 'Fashion Director',
    systemPrompt: '你是一位高级服装设计总监，专注于服装设计方向决策与趋势分析。请用专业且简洁的中文回答。',
  },
  '2': {
    name: 'Trend Researcher',
    systemPrompt: '你是一位时尚趋势研究员，专注于分析时尚趋势与市场动向。请用专业且简洁的中文回答。',
  },
  '3': {
    name: 'Design Creator',
    systemPrompt: '你是一位创意设计师，负责生成设计方案与视觉创意。请用专业且简洁的中文回答。',
  },
  '4': {
    name: 'Marketing Specialist',
    systemPrompt: '你是一位营销专家，负责制定营销策略与推广方案。请用专业且简洁的中文回答。',
  },
  '5': {
    name: 'Developer',
    systemPrompt: '你是一位开发工程师，负责AI工作台性能优化与功能开发。请用专业且简洁的中文回答。',
  },
  '6': {
    name: 'Market Analyst',
    systemPrompt: '你是一位市场分析师，负责市场数据分析与竞品研究。请用专业且简洁的中文回答。',
  },
  '7': {
    name: 'Content Creator',
    systemPrompt: '你是一位内容创作者，负责内容策划与文案撰写。请用专业且简洁的中文回答。',
  },
}

let piSession: any = null
let piAvailable = false

async function initPi() {
  try {
    const pi = await import('@earendil-works/pi-coding-agent')
    const { createAgentSession, ModelRuntime, SessionManager } = pi as any
    const modelRuntime = await ModelRuntime.create()
    const result = await createAgentSession({
      sessionManager: SessionManager.inMemory(),
      modelRuntime,
    })
    piSession = result.session
    piAvailable = true
    console.log('[pi] Agent session initialized successfully')
  } catch (err) {
    console.log('[pi] Not available, using mock responses')
    console.log('[pi] To enable real AI, install: npm install @earendil-works/pi-coding-agent')
    console.log('[pi] And set ANTHROPIC_API_KEY or OPENAI_API_KEY')
  }
}

async function getPiResponse(message: string, systemPrompt: string): Promise<string> {
  if (!piSession || !piAvailable) {
    throw new Error('pi not available')
  }
  const fullPrompt = `${systemPrompt}\n\n用户消息: ${message}`
  const response = await piSession.prompt(fullPrompt)
  return typeof response === 'string' ? response : String(response ?? '')
}

function getMockResponse(agentId: string, message: string): string {
  const config = agentConfigs[agentId] ?? agentConfigs['1']
  const responses = [
    `收到。作为${config.name}，我来分析你的需求："${message}"\n\n基于当前项目上下文，我建议从以下几个维度展开：\n1. 趋势研究 - 结合 2027 春夏最新流行数据\n2. 方案设计 - 提供不少于 3 个创意方向\n3. 落地执行 - 明确时间节点与交付物\n\n预计需要 10-15 分钟完成，是否开始执行？`,
    `我已经理解你的要求。正在处理中...\n\n根据你的描述"${message}"，我会：\n- 梳理相关资料与历史记忆\n- 生成结构化方案\n- 提供可视化结果\n\n完成后会第一时间通知你查看。`,
    `好的，我来深化这个方向。\n\n关于"${message}"，我认为可以从以下几点入手：\n1. 核心概念梳理\n2. 视觉风格定义\n3. 材质与工艺建议\n4. 商业可行性评估\n\n我已开始工作，请稍候。`,
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

app.post('/api/chat', async (req, res) => {
  const { agentId, message } = req.body as ChatRequest
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const config = agentConfigs[agentId] ?? agentConfigs['1']

  try {
    let reply: string
    if (piAvailable) {
      reply = await getPiResponse(message, config.systemPrompt)
    } else {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
      reply = getMockResponse(agentId, message)
    }
    res.json({ reply, agent: config.name })
  } catch (err) {
    const reply = getMockResponse(agentId, message)
    res.json({ reply, agent: config.name, fallback: true })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    pi: piAvailable ? 'connected' : 'mock',
    agents: Object.keys(agentConfigs).length,
  })
})

initPi().then(() => {
  app.listen(PORT, () => {
    console.log(`\n[NEXUS AI] Backend running at http://localhost:${PORT}`)
    console.log(`[NEXUS AI] Pi status: ${piAvailable ? '✅ Connected' : '⚠️  Mock mode'}`)
    console.log(`[NEXUS AI] Frontend: http://localhost:5173\n`)
  })
})
