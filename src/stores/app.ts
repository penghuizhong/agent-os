import { reactive, computed } from 'vue'
import type { Agent, Activity, Project, ChatMessage } from '@/types'
import trend01 from '@/assets/trend-01.jpg'
import trend02 from '@/assets/trend-02.jpg'
import trend03 from '@/assets/trend-03.jpg'
import optionA from '@/assets/option-a.jpg'
import optionB from '@/assets/option-b.jpg'
import heroBanner from '@/assets/hero-banner.jpg'

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
    description: '分析了 328 个全球品牌、47 场时装秀与最新市场数据，提取出 3 个核心趋势方向',
    tags: ['轻量化结构', '低饱和度金属色', '运动通勤融合'],
    metrics: [
      { label: '设计概念', value: '18' },
      { label: '色彩方案', value: '6' },
      { label: '廓形方向', value: '12' },
    ],
    trendCards: [
      { index: '01', title: '轻量化结构', description: '结构更柔和，强调流动感', image: trend01 },
      { index: '02', title: '低饱和度金属色', description: '柔和的金属光泽，未来感', image: trend02 },
      { index: '03', title: '运动与通勤融合', description: '功能性与优雅的结合', image: trend03 },
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
      { label: '方案 A: 极简奢华', description: '简约线条，高级质感，经典永恒', image: optionA },
      { label: '方案 B: 未来主义', description: '科技面料，创新廓形，前卫风格', image: optionB },
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

const state = reactive({
  agents: [] as Agent[],
  projects,
  activities,
  chatMessages: [] as ChatMessage[],
  selectedAgentId: '' as string,
  activeNav: 'today' as 'today' | 'agents' | 'projects',
  isAgentResponding: false,
  profileCardOpen: false,
  profileCardFullscreen: false,
  profileCardAgentId: '' as string,
  showCreateAgent: false,
  popupPositions: {} as Record<string, { x: number; y: number; w: number; h: number }>,
  currentUser: null as { id: string; username: string; email: string | null; avatar: string } | null,
})

export function useAppStore() {
  const selectedAgent = computed(() =>
    state.agents.find(a => a.id === state.selectedAgentId) ?? state.agents[0]
  )

  const activeAgents = computed(() =>
    state.agents.filter(a => a.status === 'working' || a.status === 'thinking')
  )

  const stats = computed(() => [
    { label: 'Agents Active', value: activeAgents.value.length, icon: 'users', color: 'text-success' },
    { label: 'Total Agents', value: state.agents.length, icon: 'check', color: 'text-primary' },
    { label: 'Decisions Waiting', value: state.agents.filter(a => a.status === 'waiting').length, icon: 'alert', color: 'text-warning' },
  ])

  function selectAgent(id: string) {
    state.selectedAgentId = id
    state.profileCardAgentId = id
    state.profileCardOpen = true
  }

  function closeProfileCard() {
    state.profileCardOpen = false
  }

  function openCreateAgent() {
    state.showCreateAgent = true
  }

  function closeCreateAgent() {
    state.showCreateAgent = false
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

    const agentMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      agentId: state.selectedAgentId,
      content: '',
      timestamp: new Date(),
      streaming: true,
    }
    addMessage(agentMsg)
    const agentIdx = state.chatMessages.length - 1

    try {
      const { sendMessage: apiSendMessage } = await import('@/api')
      
      await apiSendMessage(
        state.selectedAgentId,
        content,
        // onDelta
        (delta) => {
          if (state.chatMessages[agentIdx].thinking && !state.chatMessages[agentIdx].thinkingDone) {
            state.chatMessages[agentIdx].thinkingDone = true
          }
          state.chatMessages[agentIdx].content += delta
        },
        // onThinking
        (delta) => {
          if (!state.chatMessages[agentIdx].thinking) {
            state.chatMessages[agentIdx].thinking = ''
          }
          state.chatMessages[agentIdx].thinking += delta
        },
        // onDone
        (fullText) => {
          if (fullText) {
            state.chatMessages[agentIdx].content = fullText
          }
          state.chatMessages[agentIdx].streaming = false
          state.chatMessages[agentIdx].thinkingDone = true
        },
        // onError
        (error) => {
          state.chatMessages[agentIdx].content = error
          state.chatMessages[agentIdx].streaming = false
        },
      )

      if (state.chatMessages[agentIdx].streaming) {
        state.chatMessages[agentIdx].streaming = false
      }
    } catch {
      state.chatMessages[agentIdx].content =
        '（后端连接失败，请确保后端服务正在运行）'
      state.chatMessages[agentIdx].streaming = false
    } finally {
      state.isAgentResponding = false
    }
  }

  return {
    state,
    selectedAgent,
    activeAgents,
    stats,
    heroBanner,
    selectAgent,
    closeProfileCard,
    toggleProfileFullscreen,
    openCreateAgent,
    closeCreateAgent,
    setNav,
    sendMessage,
    addMessage,
  }
}
