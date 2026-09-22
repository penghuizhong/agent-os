<script setup lang="ts">
import LeftSidebar from '@/components/layout/LeftSidebar.vue'
import CenterPanel from '@/components/layout/CenterPanel.vue'
import AgentProfileCard from '@/components/layout/AgentProfileCard.vue'
import { useAppStore } from '@/stores/app'

const { state, closeProfileCard, toggleProfileFullscreen } = useAppStore()
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background">
    <LeftSidebar />
    <CenterPanel />

    <!-- Agent Profile Card (popup / fullscreen) -->
    <AgentProfileCard
      v-if="state.profileCardOpen"
      :agent-id="state.profileCardAgentId"
      :fullscreen="state.profileCardFullscreen"
      @close="closeProfileCard"
      @toggle-fullscreen="toggleProfileFullscreen"
    />
  </div>
</template>
