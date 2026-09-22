<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import {
  Send, Paperclip, Mic, Check, FileText, Image as ImageIcon,
  ExternalLink, CircleDot, X, Maximize2, Minimize2, ChevronDown,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import Avatar from '@/components/ui/Avatar.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Tabs from '@/components/ui/Tabs.vue'
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

const tabs = [
  { value: 'chat' as const, label: '对话' },
  { value: 'tasks' as const, label: '任务' },
  { value: 'memory' as const, label: '记忆' },
  { value: 'materials' as const, label: '资料' },
]

const statusDot = {
  working: 'bg-success',
  waiting: 'bg-warning',
  offline: 'bg-danger',
}

const statusText = {
  working: 'Working',
  waiting: 'Waiting',
  offline: 'Offline',
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
    :class="[
      'fixed z-50 flex flex-col bg-sidebar border border-border shadow-2xl transition-all duration-300',
      fullscreen
        ? 'inset-2 rounded-2xl'
        : 'top-1/2 right-4 bottom-4 w-[420px] -translate-y-1/2 rounded-2xl',
    ]"
  >
    <!-- Card Header -->
    <div class="flex items-center gap-3 border-b border-border p-4">
      <div class="relative">
        <Avatar :fallback="selectedAgent.avatar" size="lg" />
        <span
          :class="[
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar',
            statusDot[selectedAgent.status],
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
        <span>状态: {{ statusText[selectedAgent.status] }}</span>
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
          <div class="flex flex-col gap-4">
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
                <div
                  :class="[
                    'rounded-2xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card text-card-foreground rounded-tl-sm border border-border',
                  ]"
                >
                  {{ msg.content }}
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

            <!-- Loading -->
            <div v-if="state.isAgentResponding" class="flex gap-2.5">
              <Avatar :fallback="selectedAgent.avatar" size="sm" class="mt-0.5" />
              <div class="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3">
                <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 0ms" />
                <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 150ms" />
                <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style="animation-delay: 300ms" />
              </div>
            </div>

            <div ref="messagesEnd" />
          </div>
        </div>

        <!-- Input -->
        <div class="border-t border-border p-3">
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
        <div class="flex flex-col gap-2">
          <div class="rounded-lg border border-border bg-card p-3">
            <div class="flex items-center gap-2 mb-1">
              <FileText class="h-3.5 w-3.5 text-primary" />
              <span class="text-xs font-medium text-foreground">品牌定位记忆</span>
            </div>
            <p class="text-xs text-muted-foreground">高端时尚品牌，目标客群 25-40 岁都市女性</p>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <div class="flex items-center gap-2 mb-1">
              <FileText class="h-3.5 w-3.5 text-primary" />
              <span class="text-xs font-medium text-foreground">设计偏好</span>
            </div>
            <p class="text-xs text-muted-foreground">偏好极简风格，注重面料质感与剪裁</p>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <div class="flex items-center gap-2 mb-1">
              <FileText class="h-3.5 w-3.5 text-primary" />
              <span class="text-xs font-medium text-foreground">历史对话要点</span>
            </div>
            <p class="text-xs text-muted-foreground">2027春夏系列 · 三大核心趋势方向已确认</p>
          </div>
          <div class="rounded-lg border border-border bg-card p-3">
            <div class="flex items-center gap-2 mb-1">
              <FileText class="h-3.5 w-3.5 text-primary" />
              <span class="text-xs font-medium text-foreground">项目约束</span>
            </div>
            <p class="text-xs text-muted-foreground">预算上限 ¥50W，交期 2027年1月15日</p>
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
