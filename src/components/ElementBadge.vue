<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ label: string; color?: string; icon?: string }>()
// A Material icon name (lowercase, digits, underscores, e.g. "smart_display"), otherwise plain text such as an emoji.
const isMaterial = computed(() => !!props.icon && /^[a-z0-9_]+$/.test(props.icon))
const accent = computed(() => props.color ?? '#3b61ff')
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide"
    :style="{ color: accent }">
    <span v-if="isMaterial" class="material-icons-outlined" style="font-size: 16px; line-height: 1">{{ icon }}</span>
    <span v-else-if="icon" class="text-sm leading-none normal-case">{{ icon }}</span>
    {{ label }}
  </span>
</template>
