<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import { resolveRelativePath } from '@/utils/paths'
import { resolveElementDisplay } from '@/utils/elements'
import ElementBadge from './ElementBadge.vue'
import ElementEditModal from './ElementEditModal.vue'

const props = defineProps<{
  node: { attrs: { name: string; data: Record<string, unknown> } }
  selected: boolean
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
}>()

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const { loadImage } = useGitHubImage()

const config = computed(() => repo.config?.elements?.[props.node.attrs.name])
const data = computed(() => props.node.attrs.data ?? {})
const filePath = computed(() => repo.activeFile?.path)
const display = computed(() => (config.value ? resolveElementDisplay(config.value, data.value) : null))

const showModal = ref(false)

// Resolved image URLs for the strip (max 4 shown).
const thumbs = ref<string[]>([])
watch(
  () => [display.value?.images, filePath.value] as const,
  async ([images]) => {
    const list = (images ?? []).slice(0, 4)
    const urls = await Promise.all(
      list.map(async (p) => {
        try {
          const repoPath =
            (p.startsWith('.') || p.startsWith('/')) && filePath.value
              ? resolveRelativePath(filePath.value, p)
              : p
          return await loadImage(repoPath)
        } catch {
          return ''
        }
      }),
    )
    thumbs.value = urls
  },
  { immediate: true },
)

</script>

<template>
  <NodeViewWrapper class="lite-element" :class="{ selected }" contenteditable="false"
    @dblclick="config && (showModal = true)">
    <div class="rounded-xl border p-3 flex gap-3 items-start" :style="config?.color ? { borderLeft: `4px solid ${config.color}` } : undefined"
      :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-surface-50 border-surface-200'">
      <div class="flex-1 min-w-0">
        <ElementBadge :label="config?.label ?? node.attrs.name" :color="config?.color" :icon="config?.icon" />
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
          <p class="font-semibold text-sm">{{ t('element.unknown') }}: {{ node.attrs.name }}</p>
          <p class="text-xs opacity-60">{{ t('element.unknownHint') }}</p>
        </template>
      </div>
      <div class="flex gap-1 flex-shrink-0">
        <button v-if="config" type="button" @click="showModal = true"
          class="px-2 py-1 text-xs rounded-md border cursor-pointer transition-all duration-150"
          :class="ui.darkMode ? 'border-surface-600 text-surface-300 hover:bg-surface-800' : 'border-surface-300 text-surface-600 hover:bg-surface-100'">
          {{ t('element.edit') }}
        </button>
        <button type="button" @click="deleteNode()" :title="t('element.remove')"
          class="px-2 py-1 text-xs rounded-md border cursor-pointer transition-all duration-150 text-red-400 border-red-500/30 hover:bg-red-500/10">
          ✕
        </button>
      </div>
    </div>

    <ElementEditModal v-if="showModal" :name="node.attrs.name" :data="data" :file-path="filePath"
      @update:data="updateAttributes({ data: $event })" @close="showModal = false" />
  </NodeViewWrapper>
</template>

<style scoped>
.lite-element {
  margin: 1.25em 0;
}
.lite-element.selected > div:first-child {
  outline: 2px solid #3b61ff;
  outline-offset: 2px;
}
</style>
