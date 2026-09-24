<script setup lang="ts">
import { ref, computed } from 'vue'
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { login, register } from '@/api'
import { cn } from '@/lib/utils'

const emit = defineEmits<{
  success: []
}>()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const email = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const isLogin = computed(() => mode.value === 'login')
const title = computed(() => isLogin.value ? '欢迎回来' : '创建账户')
const subtitle = computed(() => isLogin.value ? '登录你的 NEXUS AI 工作台' : '开始你的 AI 之旅')
const submitLabel = computed(() => isLogin.value ? '登录' : '注册')

function switchMode() {
  mode.value = isLogin.value ? 'register' : 'login'
  error.value = ''
}

async function handleSubmit() {
  if (!username.value.trim()) {
    error.value = '请输入用户名'
    return
  }
  if (username.value.trim().length < 3) {
    error.value = '用户名至少需要3个字符'
    return
  }
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  if (password.value.length < 6) {
    error.value = '密码至少需要6个字符'
    return
  }

  loading.value = true
  error.value = ''

  try {
    if (isLogin.value) {
      await login(username.value.trim(), password.value)
    } else {
      await register(username.value.trim(), password.value, email.value.trim() || undefined)
    }
    emit('success')
  } catch (err: any) {
    error.value = err.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-4">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span class="text-lg font-bold text-primary-foreground">N</span>
          </div>
          <span class="text-xl font-semibold tracking-tight">NEXUS AI</span>
        </div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ subtitle }}</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="text-sm font-medium text-muted-foreground mb-1.5 block">用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="输入用户名"
            autocomplete="username"
            class="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div v-if="!isLogin">
          <label class="text-sm font-medium text-muted-foreground mb-1.5 block">邮箱 (可选)</label>
          <input
            v-model="email"
            type="email"
            placeholder="输入邮箱地址"
            autocomplete="email"
            class="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div>
          <label class="text-sm font-medium text-muted-foreground mb-1.5 block">密码</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="输入密码"
              autocomplete="current-password"
              class="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye v-if="!showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <LogIn v-else-if="isLogin" class="h-4 w-4" />
          <UserPlus v-else class="h-4 w-4" />
          {{ submitLabel }}
        </button>
      </form>

      <!-- Switch -->
      <div class="text-center mt-6">
        <button
          @click="switchMode"
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {{ isLogin ? '还没有账户？' : '已有账户？' }}
          <span class="text-primary font-medium">{{ isLogin ? '立即注册' : '去登录' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
