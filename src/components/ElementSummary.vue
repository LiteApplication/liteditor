<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import { resolveRelativePath } from '@/utils/paths'
import { resolveElementDisplay } from '@/utils/elements'

const props = defineProps<{ name: string; data: Record<string, unknown>; filePath?: string }>()
const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const { loadImage } = useGitHubImage()

const config = computed(() => repo.config?.elements?.[props.name])
const display = computed(() => (config.value ? resolveElementDisplay(config.value, props.data) : null))

const thumbs = ref<string[]>([])
watch(
  () => [display.value?.images, props.filePath] as const,
  async ([images]) => {
    thumbs.value = await Promise.all(
      (images ?? []).slice(0, 4).map(async (p) => {
        try {
          const repoPath =
            (p.startsWith('.') || p.startsWith('/')) && props.filePath ? resolveRelativePath(props.filePath, p) : p
          return await loadImage(repoPath)
        } catch {
          return ''
        }
      }),
    )
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-w-0">
    <template v-if="config && display">
      <p v-if="display.title" class="font-semibold text-base truncate">{{ display.title }}</p>
      <p v-if="display.description" class="text-sm line-clamp-3 opacity-70 whitespace-pre-line">{{ display.description }}</p>
      <div v-if="thumbs.length" class="flex gap-1.5 mt-2">
        <template v-for="(src, i) in thumbs" :key="i">
          <img v-if="src" :src="src" alt="" class="w-16 h-12 object-cover rounded-md" />
          <div v-else class="w-16 h-12 rounded-md" :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-200'"></div>
        </template>
        <span v-if="display.images.length > thumbs.length" class="self-center text-xs opacity-60">
          +{{ display.images.length - thumbs.length }}
        </span>
      </div>
    </template>
    <template v-else>
      <p class="font-semibold text-sm">{{ t('element.unknown') }}: {{ name }}</p>
      <p class="text-xs opacity-60">{{ t('element.unknownHint') }}</p>
    </template>
  </div>
</template>
