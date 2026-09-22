<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Sparkles, Home, Bot, Folder, Plus, Settings, ChevronDown,
  User, CreditCard, LogOut, Bell,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { formatTimeAgo } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar.vue'
import Badge from '@/components/ui/Badge.vue'

const { state, selectAgent, setNav } = useAppStore()

const navItems = [
  { id: 'today' as const, label: 'Today', icon: Home, badge: 7 },
  { id: 'agents' as const, label: 'Agents', icon: Bot, badge: undefined },
  { id: 'projects' as const, label: 'Projects', icon: Folder, badge: undefined },
]

const statusConfig = {
  working: { dot: 'bg-success', text: 'Working' },
  waiting: { dot: 'bg-warning', text: 'Waiting' },
  offline: { dot: 'bg-danger', text: 'Offline' },
}

const menuOpen = ref(false)
const menuRef = ref<HTMLElement>()

const menuItems = [
  { label: '个人主页', icon: User, desc: '查看个人资料' },
  { label: '消息通知', icon: Bell, desc: '3 条未读', badge: 3 },
  { label: '会员订阅', icon: CreditCard, desc: 'Pro · 到期 2027-06' },
  { label: '设置', icon: Settings, desc: '偏好与账户' },
]

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))
</script>

<template>
  <aside class="flex h-full w-64 flex-col border-r border-border bg-sidebar">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-5 py-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
        <Sparkles class="h-4 w-4 text-white" />
      </div>
      <div class="flex flex-col leading-none">
        <span class="text-sm font-bold text-foreground">NEXUS AI</span>
        <span class="text-[10px] text-muted-foreground">Personal AI OS</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col gap-1 px-3 pt-2">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="setNav(item.id)"
        :class="[
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          state.activeNav === item.id
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        ]"
      >
        <component :is="item.icon" class="h-4 w-4" />
        <span>{{ item.label }}</span>
        <Badge v-if="item.badge" variant="primary" class="ml-auto">{{ item.badge }}</Badge>
      </button>
    </nav>

    <!-- Create Agent Button -->
    <div class="px-3 pt-3">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg gradient-bg px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 glow"
      >
        <Plus class="h-4 w-4" />
        Create Agent
      </button>
    </div>

    <!-- My Agents -->
    <div class="mt-4 flex-1 overflow-y-auto px-3">
      <div class="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        My Agents
      </div>
      <div class="flex flex-col gap-0.5">
        <button
          v-for="agent in state.agents"
          :key="agent.id"
          @click="selectAgent(agent.id)"
          :class="[
            'flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors text-left',
            state.selectedAgentId === agent.id
              ? 'bg-accent'
              : 'hover:bg-accent/50',
          ]"
        >
          <div class="relative">
            <Avatar :fallback="agent.avatar" size="sm" />
            <span
              :class="[
                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar',
                statusConfig[agent.status].dot,
              ]"
            />
          </div>
          <div class="flex flex-1 flex-col leading-tight overflow-hidden">
            <span class="truncate text-xs font-medium text-foreground">{{ agent.name }}</span>
            <span class="truncate text-[10px] text-muted-foreground">
              {{ statusConfig[agent.status].text }} · {{ formatTimeAgo(agent.lastActive) }}
            </span>
          </div>
        </button>
      </div>

      <!-- Recent Projects -->
      <div class="mt-5">
        <div class="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </div>
        <div class="flex flex-col gap-0.5">
          <button
            v-for="project in state.projects"
            :key="project.id"
            class="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors text-left"
          >
            <span class="text-sm">{{ project.icon }}</span>
            <div class="flex flex-1 flex-col leading-tight overflow-hidden">
              <span class="truncate text-xs font-medium text-foreground">{{ project.name }}</span>
              <span class="text-[10px] text-muted-foreground">{{ formatTimeAgo(project.lastModified) }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom: Personal Center with Dropdown -->
    <div ref="menuRef" class="relative border-t border-border">
      <!-- Trigger Button -->
      <button
        @click="toggleMenu"
        :class="[
          'flex w-full items-center gap-2.5 px-3 py-2.5 transition-colors',
          menuOpen ? 'bg-accent' : 'hover:bg-accent/50',
        ]"
      >
        <!-- Avatar with gradient ring -->
        <div class="relative">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-xs font-bold text-white">
            L
          </div>
          <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success" />
        </div>
        <div class="flex flex-1 flex-col leading-tight">
          <span class="text-xs font-semibold text-foreground">Lucas Chen</span>
          <span class="text-[10px] text-muted-foreground">Pro 会员 · 在线</span>
        </div>
        <ChevronDown
          class="h-3.5 w-3.5 text-muted-foreground transition-transform"
          :class="{ 'rotate-180': menuOpen }"
        />
      </button>

      <!-- Dropdown Menu -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div
          v-if="menuOpen"
          class="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        >
          <!-- Menu Items -->
          <div class="py-1.5">
            <button
              v-for="item in menuItems"
              :key="item.label"
              @click="menuOpen = false"
              class="flex w-full items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left group"
            >
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <component :is="item.icon" class="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div class="flex flex-1 flex-col leading-tight">
                <span class="text-xs font-medium text-foreground">{{ item.label }}</span>
                <span class="text-[10px] text-muted-foreground">{{ item.desc }}</span>
              </div>
              <Badge v-if="item.badge" variant="danger">{{ item.badge }}</Badge>
            </button>
          </div>

          <!-- Divider -->
          <div class="border-t border-border" />

          <!-- Logout -->
          <div class="py-1.5">
            <button
              @click="menuOpen = false"
              class="flex w-full items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left group"
            >
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary group-hover:bg-danger/10 transition-colors">
                <LogOut class="h-3.5 w-3.5 text-muted-foreground group-hover:text-danger transition-colors" />
              </div>
              <span class="text-xs font-medium text-muted-foreground group-hover:text-danger transition-colors">退出登录</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </aside>
</template>
