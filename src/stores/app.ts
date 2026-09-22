import { reactive, ref, computed } from 'vue'
import type { Agent, Activity, Project, ChatMessage } from '@/types'

const agents: Agent[] = [
  {
    id: '1',
    name: 'Fashion Director',
    role: '你的高级服装设计总监',
    description: '负责服装设计方向决策与趋势分析',
    avatar: 'FD',
    status: 'working',
    lastActive: new Date(Date.now() - 12 * 60 * 1000),
    tags: ['Trend', 'Design', 'Collection'],
    color: '#a855f7',
  },
  {
    id: '2',
    name: 'Trend Researcher',
    role: '趋势研究员',
    description: '分析时尚趋势与市场动向',
    avatar: 'TR',
    status: 'working',
    lastActive: new Date(Date.now() - 25 * 60 * 1000),
    tags: ['Trend', 'Research'],
    color: '#3b82f6',
  },
  {
    id: '3',
    name: 'Design Creator',
    role: '设计师',
    description: '生成设计方案与视觉创意',
    avatar: 'DC',
    status: 'working',
    lastActive: new Date(Date.now() - 32 * 60 * 1000),
    tags: ['Design', 'Creative'],
    color: '#ec4899',
  },
  {
    id: '4',
    name: 'Marketing Specialist',
    role: '营销专家',
    description: '制定营销策略与推广方案',
    avatar: 'MS',
    status: 'waiting',
    lastActive: new Date(Date.now() - 60 * 60 * 1000),
    tags: ['Marketing', 'Strategy'],
    color: '#f59e0b',
  },
  {
    id: '5',
    name: 'Developer',
    role: '开发工程师',
    description: 'AI 工作台性能优化与功能开发',
    avatar: 'DV',
    status: 'working',
    lastActive: new Date(Date.now() - 60 * 60 * 1000),
    tags: ['Code', 'Performance'],
    color: '#22c55e',
  },
  {
    id: '6',
    name: 'Market Analyst',
    role: '市场分析师',
    description: '市场数据分析与竞品研究',
    avatar: 'MA',
    status: 'working',
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tags: ['Analysis', 'Market'],
    color: '#06b6d4',
  },
  {
    id: '7',
    name: 'Content Creator',
    role: '内容创作者',
    description: '内容策划与文案撰写',
    avatar: 'CC',
    status: 'offline',
    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000),
    tags: ['Content', 'Copy'],
    color: '#8b5cf6',
  },
]

const projects: Project[] = [
  { id: '1', name: '2027 春夏女装系列', lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000), icon: '👗' },
  { id: '2', name: '品牌视觉设计方案', lastModified: new Date(Date.now() - 5 * 60 * 60 * 1000), icon: '🎨' },
  { id: '3', name: '竞品分析报告', lastModified: new Date(Date.now() - 8 * 60 * 60 * 1000), icon: '📊' },
]

const activities: Activity[] = [
  {
    id: '1',
    agentId: '2',
    agentName: 'Fashion Trend Agent',
    agentAvatar: 'TR',
    time: '09:12',
    status: 'completed',
    type: 'completed',
    title: '2027 春夏女装趋势分析报告',
    description: '已完成 2027 春夏女装趋势深度分析，识别出三个核心方向',
    tags: ['轻量化结构', '低饱和度金属色', '运动通勤融合'],
    metrics: [
      { label: '设计概念', value: '18' },
      { label: '色彩方案', value: '6' },
      { label: '廓形方向', value: '12' },
    ],
  },
  {
    id: '2',
    agentId: '3',
    agentName: 'Design Agent',
    agentAvatar: 'DC',
    time: '10:24',
    status: 'needs_decision',
    type: 'decision',
    title: '设计方向选择',
    description: '基于趋势分析，提出两个设计方向，请选择或讨论',
    options: [
      { label: '方案 A: 极简奢华', description: '以简约线条和高级面料为核心，强调品质感与永恒性' },
      { label: '方案 B: 未来主义', description: '融合科技元素与创新材料，打造前卫先锋的视觉体验' },
    ],
  },
  {
    id: '3',
    agentId: '5',
    agentName: 'Developer',
    agentAvatar: 'DV',
    time: '11:03',
    status: 'completed',
    type: 'completed',
    title: 'AI 工作台性能优化',
    description: '完成了系统性能调优，响应速度与内存使用显著改善',
    metrics: [
      { label: '响应速度', value: '+18%', positive: true },
      { label: '内存占用', value: '-32%', positive: true },
      { label: '稳定性', value: '99.9%', positive: true },
    ],
  },
  {
    id: '4',
    agentId: '6',
    agentName: 'Market Analyst',
    agentAvatar: 'MA',
    time: '11:03',
    status: 'completed',
    type: 'completed',
    title: 'Q3 市场竞品分析完成',
    description: '已完成本季度竞品分析报告，详见完整文档',
    tags: ['竞品分析', '市场趋势'],
  },
]

const chatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: '继续深化那三个方向',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: '2',
    role: 'agent',
    agentId: '1',
    content: '好的，我将深化以下三个方向的设计方案，预计需要 15 分钟完成。',
    timestamp: new Date(Date.now() - 29 * 60 * 1000),
    checklist: [
      { label: '廓形设计', done: true },
      { label: '面料选择', done: true },
      { label: '色彩搭配', done: true },
      { label: '产品定位', done: false },
    ],
  },
  {
    id: '3',
    role: 'agent',
    agentId: '1',
    content: '2027 春夏系列方向深化方案已完成，请查看完整方案。',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    attachments: [
      { type: 'image', content: 'trend-analysis', label: '2027 春夏系列方向深化方案' },
    ],
  },
]

const state = reactive({
  agents,
  projects,
  activities,
  chatMessages,
  selectedAgentId: '1',
  activeNav: 'today' as 'today' | 'agents' | 'projects',
  isAgentResponding: false,
  profileCardOpen: false,
  profileCardFullscreen: false,
  profileCardAgentId: '1',
})

export function useAppStore() {
  const selectedAgent = computed(() =>
    state.agents.find(a => a.id === state.selectedAgentId) ?? state.agents[0]
  )

  const activeAgents = computed(() =>
    state.agents.filter(a => a.status === 'working' || a.status === 'waiting')
  )

  const stats = computed(() => [
    { label: 'Agents Active', value: activeAgents.value.length, icon: 'users', color: 'text-success' },
    { label: 'Tasks Completed', value: 23, icon: 'check', color: 'text-primary' },
    { label: 'Decisions Waiting', value: state.agents.filter(a => a.status === 'waiting').length + 3, icon: 'alert', color: 'text-warning' },
  ])

  function selectAgent(id: string) {
    state.selectedAgentId = id
    state.profileCardAgentId = id
    state.profileCardOpen = true
  }

  function closeProfileCard() {
    state.profileCardOpen = false
  }

  function toggleProfileFullscreen() {
    state.profileCardFullscreen = !state.profileCardFullscreen
  }

  function setNav(nav: 'today' | 'agents' | 'projects') {
    state.activeNav = nav
  }

  function addMessage(message: ChatMessage) {
    state.chatMessages.push(message)
  }

  async function sendMessage(content: string) {
    if (!content.trim() || state.isAgentResponding) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    addMessage(userMsg)

    state.isAgentResponding = true

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: state.selectedAgentId,
          message: content,
        }),
      })
      const data = await res.json()

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentId: state.selectedAgentId,
        content: data.reply ?? '抱歉，我暂时无法处理这个请求。',
        timestamp: new Date(),
      }
      addMessage(agentMsg)
    } catch {
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentId: state.selectedAgentId,
        content: '（后端未连接，请在 server/ 目录启动后端服务以启用 AI 对话）',
        timestamp: new Date(),
      }
      addMessage(agentMsg)
    } finally {
      state.isAgentResponding = false
    }
  }

  return {
    state,
    selectedAgent,
    activeAgents,
    stats,
    selectAgent,
    closeProfileCard,
    toggleProfileFullscreen,
    setNav,
    sendMessage,
    addMessage,
  }
}
