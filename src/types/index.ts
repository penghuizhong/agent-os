export type AgentStatus = 'working' | 'waiting' | 'offline'

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  avatar: string
  status: AgentStatus
  lastActive: Date
  tags: string[]
  color: string
}

export type ActivityType = 'completed' | 'decision' | 'progress' | 'info'
export type ActivityStatus = 'completed' | 'needs_decision' | 'in_progress'

export interface TrendCard {
  index: string
  title: string
  description: string
  image: string
}

export interface Activity {
  id: string
  agentId: string
  agentName: string
  agentAvatar: string
  time: string
  status: ActivityStatus
  type: ActivityType
  title: string
  description?: string
  tags?: string[]
  metrics?: { label: string; value: string; positive?: boolean }[]
  options?: { label: string; description: string; image?: string; selected?: boolean }[]
  trendCards?: TrendCard[]
}

export interface Project {
  id: string
  name: string
  lastModified: Date
  icon: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  agentId?: string
  checklist?: { label: string; done: boolean }[]
  attachments?: { type: 'image' | 'link'; content: string; label?: string }[]
}

export interface StatCard {
  label: string
  value: string | number
  icon: string
  color: string
}
