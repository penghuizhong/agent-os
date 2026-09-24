<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LeftSidebar from '@/components/layout/LeftSidebar.vue'
import CenterPanel from '@/components/layout/CenterPanel.vue'
import AgentProfileCard from '@/components/layout/AgentProfileCard.vue'
import CreateAgentDialog from '@/components/layout/CreateAgentDialog.vue'
import LoginPage from '@/pages/LoginPage.vue'
import { useAppStore } from '@/stores/app'
import { getToken, getStoredUser, logout, getAgents } from '@/api'

const { state, closeProfileCard, toggleProfileFullscreen, closeCreateAgent } = useAppStore()

const isAuthenticated = ref(false)
const isLoading = ref(true)

onMounted(async () => {
  // 检查是否有有效的 token
  const token = getToken()
  const user = getStoredUser()
  
  if (token && user) {
    isAuthenticated.value = true
    state.currentUser = user
    // 加载用户的 agents
    await loadUserAgents()
  }
  isLoading.value = false
})

async function loadUserAgents() {
  try {
    const agents = await getAgents()
    state.agents = agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      description: a.description || '',
      avatar: a.avatar,
      tags: a.tags,
      status: (a.status || 'idle') as any,
      lastActive: new Date(),
      color: '#6366f1',
    }))
  } catch (err) {
    console.error('Failed to load agents:', err)
  }
}

function handleLoginSuccess() {
  const user = getStoredUser()
  if (user) {
    state.currentUser = user
    isAuthenticated.value = true
    loadUserAgents()
  }
}

function handleLogout() {
  logout()
  isAuthenticated.value = false
  state.currentUser = null
  state.agents = []
}

// 暴露给子组件
defineExpose({ handleLogout, loadUserAgents })
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center bg-background">
    <div class="flex items-center gap-3">
      <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
        <span class="text-sm font-bold text-primary-foreground">N</span>
      </div>
      <span class="text-lg font-semibold">NEXUS AI</span>
    </div>
  </div>

  <!-- Login Page -->
  <LoginPage v-else-if="!isAuthenticated" @success="handleLoginSuccess" />

  <!-- Main App -->
  <div v-else class="flex h-screen w-full overflow-hidden bg-background">
    <LeftSidebar @logout="handleLogout" />
    <CenterPanel />

    <!-- Agent Profile Card (popup / fullscreen) -->
    <AgentProfileCard
      v-if="state.profileCardOpen"
      :agent-id="state.profileCardAgentId"
      :fullscreen="state.profileCardFullscreen"
      @close="closeProfileCard"
      @toggle-fullscreen="toggleProfileFullscreen"
    />

    <!-- Create Agent Dialog -->
    <CreateAgentDialog
      v-if="state.showCreateAgent"
      @close="closeCreateAgent"
    />
  </div>
</template>
