<script setup lang="ts" generic="T extends string">
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: T
  tabs: { value: T; label: string; icon?: string }[]
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div :class="cn('flex items-center gap-1 border-b border-border px-2', props.class)">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="emit('update:modelValue', tab.value)"
      :class="cn(
        'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors relative -mb-px border-b-2',
        modelValue === tab.value
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )"
    >
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>
