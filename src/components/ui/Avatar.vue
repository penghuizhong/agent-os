<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  src?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  class?: string
}>()

const sizeClass = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}
</script>

<template>
  <div
    :class="cn(
      'relative flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-secondary font-medium text-muted-foreground',
      sizeClass[size ?? 'md'],
      props.class
    )"
  >
    <img v-if="src" :src="src" :alt="fallback" class="h-full w-full object-cover" />
    <span v-else>{{ fallback }}</span>
  </div>
</template>
