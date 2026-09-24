<script setup lang="ts">
import { ref } from 'vue'
import { X, Sparkles } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { createAgent as apiCreateAgent } from '@/api'
import type { Agent } from '@/types'

const emit = defineEmits<{ close: [] }>()

const { state } = useAppStore()

const name = ref('')
const role = ref('')
const description = ref('')
const tagsInput = ref('')
const creating = ref(false)
const error = ref('')

const presetRoles = [
  '产品经理', '数据分析师', '文案策划', '用户研究员',
  '前端工程师', '后端工程师', 'UI 设计师', '测试工程师',
]

async function handleCreate() {
  if (!name.value.trim()) {
    error.value = '请输入 Agent 名称'
    return
  }
  creating.value = true
  error.value = ''
  const tags = tagsInput.value
    .split(/[,，\s]+/)
    .map(t => t.trim())
    .filter(Boolean)

  try {
    const data = await apiCreateAgent({
      name: name.value.trim(),
      role: role.value.trim() || name.value.trim(),
      description: description.value.trim(),
      tags,
    })

    const newAgent: Agent = {
      id: data.id,
      name: data.name,
      role: data.role,
      description: data.description || '',
      avatar: data.avatar || name.value.slice(0, 2).toUpperCase(),
      status: (data.status || 'idle') as any,
      lastActive: new Date(),
      tags: data.tags || tags,
      color: '#6366f1',
    }
    state.agents.push(newAgent)
    state.selectedAgentId = newAgent.id
    state.profileCardAgentId = newAgent.id
    state.profileCardOpen = true
    state.showCreateAgent = false
    emit('close')
  } catch (err: any) {
    error.value = err.message || '创建失败'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="w-[460px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-sidebar shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg gradient-bg">
            <Sparkles class="h-3.5 w-3.5 text-white" />
          </div>
          <h2 class="text-base font-semibold text-foreground">创建新 Agent</h2>
        </div>
        <button
          @click="emit('close')"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-4 p-5">
        <!-- Name -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-foreground">Agent 名称 <span class="text-danger">*</span></label>
          <input
            v-model="name"
            type="text"
            placeholder="例如：Color Specialist"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <!-- Role -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-foreground">角色定位</label>
          <input
            v-model="role"
            type="text"
            placeholder="例如：色彩专家"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="preset in presetRoles"
              :key="preset"
              @click="role = preset"
              class="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              {{ preset }}
            </button>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-foreground">能力描述</label>
          <textarea
            v-model="description"
            placeholder="描述这个 Agent 的专长和职责..."
            rows="3"
            class="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <!-- Tags -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-foreground">标签（逗号分隔）</label>
          <input
            v-model="tagsInput"
            type="text"
            placeholder="例如：Color, Fashion, Trend"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <!-- Error -->
        <p v-if="error" class="text-xs text-danger">{{ error }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <button
          @click="emit('close')"
          class="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          取消
        </button>
        <button
          @click="handleCreate"
          :disabled="creating || !name.trim()"
          class="flex items-center gap-1.5 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {{ creating ? '创建中...' : '创建并对话' }}
        </button>
      </div>
    </div>
  </div>
</template>
