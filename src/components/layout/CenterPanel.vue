<script setup lang="ts">
import { Users, CheckCircle2, AlertCircle, Check, ArrowRight } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import Avatar from '@/components/ui/Avatar.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'

const { state, stats, heroBanner } = useAppStore()

const statIcons = { users: Users, check: CheckCircle2, alert: AlertCircle }

const statusConfig = {
  completed: { icon: Check, color: 'text-success', bg: 'bg-success/10', label: 'Completed' },
  needs_decision: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10', label: 'Needs Decision' },
  in_progress: { icon: ArrowRight, color: 'text-primary', bg: 'bg-primary/10', label: 'In Progress' },
}
</script>

<template>
  <main class="flex h-full flex-1 flex-col overflow-hidden">
    <!-- Scrollable Content (no top bar) -->
    <div class="flex-1 overflow-y-auto px-6 py-5">
      <!-- Greeting -->
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-foreground">Good Morning, Lucas <span class="inline-block">☀️</span></h1>
        <p class="mt-1 text-sm text-muted-foreground">你的 AI 团队今天为你完成了 {{ stats[0].value }} 项重要更新</p>
      </div>

      <!-- Hero Banner -->
      <div class="group relative mb-5 h-32 overflow-hidden rounded-xl cursor-pointer">
        <img
          :src="heroBanner"
          alt="Morning landscape"
          class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div class="absolute bottom-3 left-4">
          <p class="text-sm font-medium text-white">2027 春夏系列 · 创意季</p>
          <p class="text-xs text-white/70">7 个 Agent 正在协同工作</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="mb-6 grid grid-cols-3 gap-3">
        <Card v-for="stat in stats" :key="stat.label" class="flex items-center gap-3 py-3">
          <div :class="['flex h-10 w-10 items-center justify-center rounded-lg', stat.color.includes('success') ? 'bg-success/10' : stat.color.includes('primary') ? 'bg-primary/10' : 'bg-warning/10']">
            <component :is="statIcons[stat.icon as keyof typeof statIcons]" :class="['h-5 w-5', stat.color]" />
          </div>
          <div>
            <div class="text-xl font-bold text-foreground">{{ stat.value }}</div>
            <div class="text-xs text-muted-foreground">{{ stat.label }}</div>
          </div>
        </Card>
      </div>

      <!-- Activity Feed -->
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Today's Activity</h2>
        <button class="text-xs text-muted-foreground hover:text-foreground">View All</button>
      </div>

      <div class="flex flex-col gap-3">
        <Card
          v-for="activity in state.activities"
          :key="activity.id"
          :hoverable="activity.status === 'needs_decision'"
          class="relative"
        >
          <!-- Activity Header -->
          <div class="flex items-start gap-3">
            <Avatar :fallback="activity.agentAvatar" size="md" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-foreground">{{ activity.agentName }}</span>
                <Badge
                  :variant="activity.status === 'completed' ? 'success' : activity.status === 'needs_decision' ? 'warning' : 'primary'"
                >
                  <component :is="statusConfig[activity.status].icon" class="h-3 w-3" />
                  {{ statusConfig[activity.status].label }}
                </Badge>
                <span class="ml-auto text-xs text-muted-foreground">{{ activity.time }}</span>
              </div>
              <h3 class="mt-1.5 text-sm font-medium text-foreground">{{ activity.title }}</h3>
              <p v-if="activity.description" class="mt-1 text-xs text-muted-foreground">{{ activity.description }}</p>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="activity.tags" class="mt-3 flex flex-wrap gap-1.5">
            <Badge v-for="tag in activity.tags" :key="tag" variant="outline">{{ tag }}</Badge>
          </div>

          <!-- Trend Cards with Images -->
          <div v-if="activity.trendCards" class="mt-3 grid grid-cols-3 gap-3">
            <div
              v-for="trend in activity.trendCards"
              :key="trend.index"
              class="group overflow-hidden rounded-lg border border-border bg-card cursor-pointer transition-all hover:border-primary/40"
            >
              <div class="relative aspect-[4/3] overflow-hidden">
                <img
                  :src="trend.image"
                  :alt="trend.title"
                  class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-125"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span class="absolute top-2 left-2 text-[10px] font-bold text-white/80">{{ trend.index }}</span>
              </div>
              <div class="p-2.5">
                <div class="text-xs font-medium text-foreground">{{ trend.title }}</div>
                <div class="mt-0.5 text-[10px] text-muted-foreground">{{ trend.description }}</div>
              </div>
            </div>
          </div>

          <!-- Metrics -->
          <div v-if="activity.metrics" class="mt-3 flex gap-4 border-t border-border pt-3">
            <div v-for="metric in activity.metrics" :key="metric.label">
              <div :class="['text-lg font-bold', metric.positive ? 'text-success' : 'text-foreground']">
                {{ metric.value }}
              </div>
              <div class="text-[10px] text-muted-foreground">{{ metric.label }}</div>
            </div>
          </div>

          <!-- Decision Options with Images -->
          <div v-if="activity.options" class="mt-3 grid grid-cols-2 gap-3">
            <button
              v-for="(option, idx) in activity.options"
              :key="idx"
              class="group overflow-hidden rounded-lg border border-border text-left transition-all hover:border-primary/40 hover:bg-accent/50"
            >
              <div v-if="option.image" class="relative aspect-[4/3] overflow-hidden">
                <img
                  :src="option.image"
                  :alt="option.label"
                  class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-125"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div class="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white border border-white/20">
                  {{ String.fromCharCode(65 + idx) }}
                </div>
              </div>
              <div class="p-3">
                <span class="text-sm font-medium text-foreground">{{ option.label.split(': ')[1] }}</span>
                <p class="mt-1 text-xs text-muted-foreground">{{ option.description }}</p>
              </div>
            </button>
          </div>

          <!-- Action Buttons -->
          <div v-if="activity.status === 'needs_decision'" class="mt-3 flex gap-2">
            <Button size="sm" variant="gradient">选择 A</Button>
            <Button size="sm" variant="outline">选择 B</Button>
            <Button size="sm" variant="ghost">讨论一下</Button>
          </div>
          <div v-else class="mt-3">
            <button class="text-xs text-primary hover:underline">查看报告 →</button>
          </div>
        </Card>
      </div>
    </div>
  </main>
</template>
