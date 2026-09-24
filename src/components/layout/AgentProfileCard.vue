<script setup lang="ts">
import { ref, nextTick, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  Send, Paperclip, Mic, Check, FileText, Image as ImageIcon,
  ExternalLink, CircleDot, X, Maximize2, Minimize2, ChevronDown,
  BrainCircuit, GripHorizontal, Trash2, Loader2,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { getChatHistory, clearChatHistory, getMemories, type ChatHistoryItem, type Memory } from '@/api'
import Avatar from '@/components/ui/Avatar.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Tabs from '@/components/ui/Tabs.vue'
import type { ChatMessage } from '@/types'
import { cn } from '@/lib/utils'

const props = defineProps<{
  agentId: string
  fullscreen: boolean
}>()

const emit = defineEmits<{
  close: []
  toggleFullscreen: []
}>()

const { state, sendMessage } = useAppStore()

const selectedAgent = computed(() =>
  state.agents.find(a => a.id === props.agentId) ?? state.agents[0]
)

const inputText = ref('')
const messagesEnd = ref<HTMLElement>()
const localTab = ref<'chat' | 'tasks' | 'memory' | 'materials'>('chat')
const expandedThinking = ref<Set<string>>(new Set())

// 历史记录和记忆
const historyLoaded = ref(false)
const memories = ref<Memory[]>([])
const memoriesLoading = ref(false)
const historyLoading = ref(false)
const clearingHistory = ref(false)

function toggleThinking(msgId: string) {
  if (expandedThinking.value.has(msgId)) {
    expandedThinking.value.delete(msgId)
  } else {
    expandedThinking.value.add(msgId)
  }
}

// 加载历史会话
async function loadHistory() {
  if (historyLoaded.value) return
  historyLoading.value = true
  try {
    const history = await getChatHistory(props.agentId)
    // 将历史消息转换为 ChatMessage 格式
    const messages: ChatMessage[] = history.map((item: ChatHistoryItem) => ({
      id: item.id,
      role: item.role === 'assistant' ? 'agent' as const : 'user' as const,
      content: item.content,
      timestamp: new Date(item.timestamp),
      agentId: item.role === 'assistant' ? props.agentId : undefined,
      thinking: item.thinking || undefined,
      thinkingDone: !!item.thinking,
    }))
    state.chatMessages = messages
    historyLoaded.value = true
    scrollToBottom()
  } catch (err) {
    console.error('Failed to load history:', err)
  } finally {
    historyLoading.value = false
  }
}

// 加载记忆
async function loadMemories() {
  memoriesLoading.value = true
  try {
    memories.value = await getMemories(props.agentId)
  } catch (err) {
    console.error('Failed to load memories:', err)
  } finally {
    memoriesLoading.value = false
  }
}

// 清除历史
async function handleClearHistory() {
  if (!confirm('确定要清除所有对话历史吗？此操作不可撤销。')) return
  clearingHistory.value = true
  try {
    await clearChatHistory(props.agentId)
    state.chatMessages = []
    historyLoaded.value = true
  } catch (err) {
    console.error('Failed to clear history:', err)
  } finally {
    clearingHistory.value = false
  }
}

// 组件挂载时加载历史
onMounted(() => {
  loadHistory()
  loadMemories()
})

// agentId 变化时重新加载
watch(() => props.agentId, () => {
  historyLoaded.value = false
  loadHistory()
  loadMemories()
})

// --- Drag & Resize state ---
const savedPos = (() => {
  try {
    const saved = localStorage.getItem(`popup-pos-${props.agentId}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
})()

const popupPos = ref(savedPos ? { x: savedPos.x, y: savedPos.y } : { x: -1, y: -1 })
const popupSize = ref(savedPos ? { w: savedPos.w, h: savedPos.h } : { w: 440, h: 700 })
const isDragging = ref(false)
const isResizing = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const resizeDir = ref('')
const resizeStart = ref({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 })
const cardRef = ref<HTMLElement>()

const MIN_W = 340
const MIN_H = 400

function savePosition() {
  try {
    localStorage.setItem(`popup-pos-${props.agentId}`, JSON.stringify({
      x: popupPos.value.x,
      y: popupPos.value.y,
      w: popupSize.value.w,
      h: popupSize.value.h,
    }))
  } catch {}
}

function initDefaultPosition() {
  if (popupPos.value.x === -1) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    popupPos.value = {
      x: vw - popupSize.value.w - 24,
      y: Math.max(16, (vh - popupSize.value.h) / 2),
    }
  }
}

// Drag handlers
function onHeaderMouseDown(e: MouseEvent) {
  if (props.fullscreen) return
  e.preventDefault()
  initDefaultPosition()
  isDragging.value = true
  dragOffset.value = { x: e.clientX - popupPos.value.x, y: e.clientY - popupPos.value.y }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (isDragging.value) {
    popupPos.value = {
      x: Math.max(0, Math.min(e.clientX - dragOffset.value.x, window.innerWidth - popupSize.value.w)),
      y: Math.max(0, Math.min(e.clientY - dragOffset.value.y, window.innerHeight - 40)),
    }
  }
  if (isResizing.value) {
    onResizeMove(e)
  }
}

function onDragEnd() {
  if (isDragging.value || isResizing.value) {
    savePosition()
  }
  isDragging.value = false
  isResizing.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// Resize handlers
function onResizeMouseDown(e: MouseEvent, dir: string) {
  if (props.fullscreen) return
  e.preventDefault()
  e.stopPropagation()
  initDefaultPosition()
  isResizing.value = true
  resizeDir.value = dir
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    w: popupSize.value.w,
    h: popupSize.value.h,
    px: popupPos.value.x,
    py: popupPos.value.y,
  }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onResizeMove(e: MouseEvent) {
  const dx = e.clientX - resizeStart.value.x
  const dy = e.clientY - resizeStart.value.y
  const dir = resizeDir.value
  let newW = resizeStart.value.w
  let newH = resizeStart.value.h
  let newX = resizeStart.value.px
  let newY = resizeStart.value.py

  if (dir.includes('e')) newW = Math.max(MIN_W, resizeStart.value.w + dx)
  if (dir.includes('w')) {
    newW = Math.max(MIN_W, resizeStart.value.w - dx)
    if (newW === MIN_W) newX = resizeStart.value.px + resizeStart.value.w - MIN_W
    else newX = resizeStart.value.px + dx
  }
  if (dir.includes('s')) newH = Math.max(MIN_H, resizeStart.value.h + dy)
  if (dir.includes('n')) {
    newH = Math.max(MIN_H, resizeStart.value.h - dy)
    if (newH === MIN_H) newY = resizeStart.value.py + resizeStart.value.h - MIN_H
    else newY = resizeStart.value.py + dy
  }

  popupSize.value = { w: newW, h: newH }
  popupPos.value = { x: newX, y: newY }
}

const tabs = [
  { value: 'chat' as const, label: '对话' },
  { value: 'tasks' as const, label: '任务' },
  { value: 'memory' as const, label: '记忆' },
  { value: 'materials' as const, label: '资料' },
]

const statusDot: Record<string, string> = {
  working: 'bg-success',
  waiting: 'bg-warning',
  offline: 'bg-danger',
  idle: 'bg-muted-foreground',
  thinking: 'bg-primary animate-pulse',
}

const statusText: Record<string, string> = {
  working: 'Working',
  waiting: 'Waiting',
  offline: 'Offline',
  idle: 'Idle',
  thinking: 'Thinking...',
}

async function handleSend() {
  if (!inputText.value.trim() || state.isAgentResponding) return
  const msg = inputText.value
  inputText.value = ''
  await sendMessage(msg)
  scrollToBottom()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(() => state.chatMessages.length, scrollToBottom)
watch(
  () => state.chatMessages.map(m => m.thinking?.length ?? 0).join(','),
  () => scrollToBottom(),
)
</script>

<template>
  <!-- Backdrop (only in popup mode) -->
  <div
    v-if="!fullscreen"
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
    @click="emit('close')"
  />

  <!-- Card Container -->
  <div
    ref="cardRef"
    :class="[
      'fixed z-50 flex flex-col bg-sidebar border border-border shadow-2xl rounded-2xl',
      fullscreen ? 'inset-2' : '',
      isDragging ? 'select-none' : '',
      isResizing ? 'select-none' : '',
    ]"
    :style="!fullscreen ? {
      left: popupPos.x === -1 ? '' : popupPos.x + 'px',
      top: popupPos.y === -1 ? '' : popupPos.y + 'px',
      right: popupPos.x === -1 ? '16px' : '',
      width: popupSize.w + 'px',
      height: popupSize.h + 'px',
      transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
    } : {}"
  >
    <!-- Resize Handles (8 directions) -->
    <template v-if="!fullscreen">
      <div class="absolute inset-x-2 -top-1 h-2 cursor-n-resize z-10" @mousedown="onResizeMouseDown($event, 'n')" />
      <div class="absolute inset-x-2 -bottom-1 h-2 cursor-s-resize z-10" @mousedown="onResizeMouseDown($event, 's')" />
      <div class="absolute -left-1 inset-y-2 w-2 cursor-e-resize z-10" @mousedown="onResizeMouseDown($event, 'w')" />
      <div class="absolute -right-1 inset-y-2 w-2 cursor-w-resize z-10" @mousedown="onResizeMouseDown($event, 'e')" />
      <div class="absolute -top-1 -left-1 h-3 w-3 cursor-nw-resize z-10" @mousedown="onResizeMouseDown($event, 'nw')" />
      <div class="absolute -top-1 -right-1 h-3 w-3 cursor-ne-resize z-10" @mousedown="onResizeMouseDown($event, 'ne')" />
      <div class="absolute -bottom-1 -left-1 h-3 w-3 cursor-sw-resize z-10" @mousedown="onResizeMouseDown($event, 'sw')" />
      <div class="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize z-10" @mousedown="onResizeMouseDown($event, 'se')" />
    </template>

    <!-- Card Header (draggable) -->
    <div
      class="flex items-center gap-3 border-b border-border p-4"
      :class="[!fullscreen ? 'cursor-grab active:cursor-grabbing' : '']"
      @mousedown="onHeaderMouseDown"
    >
      <GripHorizontal v-if="!fullscreen" class="h-4 w-4 text-muted-foreground/50 shrink-0" />
      <div class="relative">
        <Avatar :fallback="selectedAgent.avatar" size="lg" />
        <span
          :class="[
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar',
            statusDot[selectedAgent.status] || statusDot['idle'],
          ]"
        />
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="text-base font-semibold text-foreground">{{ selectedAgent.name }}</h2>
        <p class="truncate text-xs text-muted-foreground">{{ selectedAgent.role }}</p>
        <div class="mt-1 flex flex-wrap gap-1">
          <Badge v-for="tag in selectedAgent.tags" :key="tag" variant="primary">{{ tag }}</Badge>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-1">
        <button
          @click="emit('toggleFullscreen')"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          :title="fullscreen ? '弹窗模式' : '全屏模式'"
        >
          <component :is="fullscreen ? Minimize2 : Maximize2" class="h-4 w-4" />
        </button>
        <button
          @click="emit('close')"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="关闭"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Agent Description Bar -->
    <div class="border-b border-border px-4 py-2.5">
      <p class="text-xs text-muted-foreground">{{ selectedAgent.description }}</p>
      <div class="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>状态: {{ statusText[selectedAgent.status] || 'Idle' }}</span>
        <span>·</span>
        <span>最后活跃: {{ new Date(selectedAgent.lastActive).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs
      :model-value="localTab"
      @update:model-value="localTab = $event as any"
      :tabs="tabs"
    />

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden">
      <!-- Chat Tab -->
      <div v-if="localTab === 'chat'" class="flex h-full flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Loading history -->
          <div v-if="historyLoading" class="flex items-center justify-center py-8">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
            <span class="ml-2 text-xs text-muted-foreground">加载对话历史...</span>
          </div>

          <!-- Empty state -->
          <div v-else-if="state.chatMessages.length === 0" class="flex flex-col items-center justify-center py-12">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Send class="h-5 w-5 text-primary" />
            </div>
            <p class="text-sm text-muted-foreground">开始和 {{ selectedAgent.name }} 对话吧</p>
            <p class="text-xs text-muted-foreground/60 mt-1">输入消息即可开始</p>
          </div>

          <!-- Messages -->
          <div v-else class="flex flex-col gap-4">
            <div
              v-for="msg in state.chatMessages"
              :key="msg.id"
              :class="[
                'flex gap-2.5',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              ]"
            >
              <Avatar
                v-if="msg.role === 'agent'"
                :fallback="selectedAgent.avatar"
                size="sm"
                class="mt-0.5"
              />
              <div
                v-else
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 mt-0.5"
              >
                <span class="text-xs font-medium text-primary">L</span>
              </div>

              <div :class="['flex flex-col gap-1.5 max-w-[75%]', msg.role === 'user' ? 'items-end' : 'items-start']">
                <!-- Thinking Process -->
                <div
                  v-if="msg.thinking && msg.role === 'agent'"
                  class="w-full"
                >
                  <button
                    @click="toggleThinking(msg.id)"
                    :class="[
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-200 border',
                      msg.thinkingDone
                        ? 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted/80 cursor-pointer'
                        : 'bg-primary/5 border-primary/20 text-primary',
                    ]"
                  >
                    <BrainCircuit :class="['h-3.5 w-3.5', msg.thinkingDone ? '' : 'animate-pulse']" />
                    <span class="font-medium">
                      {{ msg.thinkingDone ? '思考过程' : '思考中' }}
                    </span>
                    <span
                      v-if="!msg.thinkingDone"
                      class="flex items-center gap-0.5"
                    >
                      <span class="h-1 w-1 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0ms" />
                      <span class="h-1 w-1 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 150ms" />
                      <span class="h-1 w-1 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 300ms" />
                    </span>
                    <ChevronDown
                      :class="[
                        'h-3 w-3 ml-auto transition-transform duration-200',
                        expandedThinking.has(msg.id) ? 'rotate-180' : '',
                      ]"
                    />
                  </button>

                  <div
                    v-if="expandedThinking.has(msg.id) || !msg.thinkingDone"
                    :class="[
                      'mt-1 rounded-xl border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto transition-all duration-300',
                      msg.thinkingDone
                        ? 'max-h-48 bg-muted/30 border-border/50 text-muted-foreground'
                        : 'max-h-32 bg-primary/5 border-primary/10 text-muted-foreground',
                    ]"
                  >
                    {{ msg.thinking }}<span
                      v-if="!msg.thinkingDone"
                      class="inline-block w-1 h-3 bg-primary/50 ml-0.5 align-middle animate-pulse"
                    />
                  </div>
                </div>

                <!-- Main content bubble -->
                <div
                  v-if="msg.content"
                  :class="[
                    'rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card text-card-foreground rounded-tl-sm border border-border',
                  ]"
                >
                  {{ msg.content }}<span
                    v-if="msg.streaming"
                    class="inline-block w-1.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse"
                  />
                </div>
                <div
                  v-else-if="msg.streaming && !msg.thinking"
                  class="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 0ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 150ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 300ms" />
                </div>

                <!-- Checklist -->
                <div v-if="msg.checklist" class="rounded-xl border border-border bg-card p-3 w-full">
                  <div class="flex flex-col gap-2">
                    <div
                      v-for="item in msg.checklist"
                      :key="item.label"
                      class="flex items-center gap-2"
                    >
                      <div
                        :class="[
                          'flex h-4 w-4 items-center justify-center rounded',
                          item.done ? 'bg-success text-white' : 'border border-border',
                        ]"
                      >
                        <Check v-if="item.done" class="h-2.5 w-2.5" />
                      </div>
                      <span :class="['text-xs', item.done ? 'text-muted-foreground line-through' : 'text-foreground']">
                        {{ item.label }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                    <span class="text-[10px] text-muted-foreground">预计需要 15 分钟</span>
                    <Button size="sm" variant="gradient">开始执行</Button>
                  </div>
                </div>

                <!-- Attachments -->
                <div v-if="msg.attachments" class="flex flex-col gap-2 w-full">
                  <div
                    v-for="(att, idx) in msg.attachments"
                    :key="idx"
                    class="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div class="flex items-center gap-2 p-2.5">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <ImageIcon class="h-4 w-4 text-primary" />
                      </div>
                      <span class="flex-1 text-xs font-medium text-foreground">{{ att.label }}</span>
                      <ExternalLink class="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <span class="text-[10px] text-muted-foreground px-1">
                  {{ msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
            </div>

            <div ref="messagesEnd" />
          </div>
        </div>

        <!-- Input -->
        <div class="border-t border-border p-3">
          <!-- Clear history button -->
          <div v-if="state.chatMessages.length > 0" class="flex justify-end mb-2">
            <button
              @click="handleClearHistory"
              :disabled="clearingHistory"
              class="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 :class="['h-3 w-3', clearingHistory ? 'animate-spin' : '']" />
              清除历史
            </button>
          </div>
          <div class="flex items-end gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
            <button class="text-muted-foreground hover:text-foreground transition-colors pb-1">
              <Paperclip class="h-4 w-4" />
            </button>
            <textarea
              v-model="inputText"
              @keydown="handleKeydown"
              :placeholder="`Talk to ${selectedAgent.name}...`"
              rows="1"
              class="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-1.5"
              style="max-height: 100px"
            />
            <button
              v-if="!inputText.trim()"
              class="text-muted-foreground hover:text-foreground transition-colors pb-1"
            >
              <Mic class="h-4 w-4" />
            </button>
            <button
              v-else
              @click="handleSend"
              :disabled="state.isAgentResponding"
              class="flex h-7 w-7 items-center justify-center rounded-lg gradient-bg text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Tasks Tab -->
      <div v-else-if="localTab === 'tasks'" class="h-full overflow-y-auto p-4">
        <div class="flex flex-col gap-2">
          <div v-for="task in [
            { label: '廓形设计深化', done: true, desc: '基于轻量化结构趋势展开' },
            { label: '面料选择与搭配', done: true, desc: '低饱和度金属色方案确认' },
            { label: '色彩方案制定', done: true, desc: '6 套色彩组合已完成' },
            { label: '产品定位报告', done: false, desc: '待确认目标客群与价格区间' },
          ]" :key="task.label" class="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
            <CircleDot :class="['h-4 w-4 mt-0.5', task.done ? 'text-success' : 'text-muted-foreground']" />
            <div class="flex-1">
              <span :class="['text-sm font-medium', task.done ? 'text-muted-foreground line-through' : 'text-foreground']">
                {{ task.label }}
              </span>
              <p class="text-xs text-muted-foreground mt-0.5">{{ task.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Memory Tab -->
      <div v-else-if="localTab === 'memory'" class="h-full overflow-y-auto p-4">
        <!-- Loading -->
        <div v-if="memoriesLoading" class="flex items-center justify-center py-8">
          <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          <span class="ml-2 text-xs text-muted-foreground">加载记忆...</span>
        </div>

        <!-- Empty state -->
        <div v-else-if="memories.length === 0" class="flex flex-col items-center justify-center py-12">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <BrainCircuit class="h-5 w-5 text-primary" />
          </div>
          <p class="text-sm text-muted-foreground">暂无记忆</p>
          <p class="text-xs text-muted-foreground/60 mt-1">对话过程中会自动提取关键信息作为记忆</p>
        </div>

        <!-- Memory list -->
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="memory in memories"
            :key="memory.id"
            class="rounded-lg border border-border bg-card p-3"
          >
            <div class="flex items-center gap-2 mb-1">
              <FileText class="h-3.5 w-3.5 text-primary" />
              <span class="text-xs font-medium text-foreground">{{ memory.content }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1.5">
              <span class="text-[10px] text-muted-foreground">
                {{ new Date(memory.createdAt).toLocaleDateString('zh-CN') }}
              </span>
              <span v-if="memory.importance > 0" class="text-[10px] text-warning">
                重要度: {{ '★'.repeat(memory.importance) }}
              </span>
              <Badge v-for="tag in memory.tags" :key="tag" variant="primary" class="text-[9px] px-1.5 py-0">{{ tag }}</Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Materials Tab -->
      <div v-else class="h-full overflow-y-auto p-4">
        <div class="grid grid-cols-2 gap-2">
          <div v-for="n in 6" :key="n" class="overflow-hidden rounded-lg border border-border bg-card">
            <div class="aspect-video bg-gradient-to-br from-primary/20 to-accent" />
            <div class="p-2">
              <div class="text-xs font-medium text-foreground">参考素材 {{ n }}</div>
              <div class="text-[10px] text-muted-foreground">Fashion Reference</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
