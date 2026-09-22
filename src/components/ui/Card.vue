<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
  hoverable?: boolean
}>()
</script>

<template>
  <div
    :class="cn(
      'rounded-xl border border-border bg-card p-4',
      hoverable && 'transition-all hover:border-primary/30 hover:bg-card/80 cursor-pointer',
      props.class
    )"
  >
    <slot />
  </div>
</template>
