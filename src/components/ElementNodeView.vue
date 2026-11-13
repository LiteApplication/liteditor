<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import { resolveRelativePath } from '@/utils/paths'
import { resolveElementDisplay } from '@/utils/elements'
import FieldInput from './FieldInput.vue'

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

const fieldEntries = computed(() => Object.entries(config.value?.fields ?? {}))
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

function updateField(key: string, val: unknown) {
  props.updateAttributes({ data: { ...data.value, [key]: val } })
}
</script>

<template>
  <NodeViewWrapper class="lite-element" :class="{ selected }" contenteditable="false"
    @dblclick="config && (showModal = true)">
    <div class="rounded-xl border p-3 flex gap-3 items-start"
      :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-surface-50 border-surface-200'">
      <div class="flex-1 min-w-0">
        <span class="text-[10px] font-semibold uppercase tracking-wide"
          :class="ui.darkMode ? 'text-brand-300' : 'text-brand-600'">
          {{ config?.label ?? node.attrs.name }}
        </span>
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

    <Teleport to="body">
      <div v-if="showModal && config" class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showModal = false">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
        <div class="relative z-50 w-full max-w-lg rounded-2xl border flex flex-col overflow-hidden"
          style="max-height: 85vh;"
          :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200 shadow-2xl'">
          <div class="px-5 py-3 border-b flex-shrink-0" :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
            <h4 class="font-semibold text-sm">{{ config.label }}</h4>
            <p v-if="config.description" class="text-xs opacity-60">{{ config.description }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div v-for="[key, schema] in fieldEntries" :key="key">
              <label class="block mb-1.5">
                <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
                  {{ schema.label || key }}
                </span>
                <span v-if="schema.description" class="block text-xs mt-0.5"
                  :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">{{ schema.description }}</span>
              </label>
              <FieldInput :model-value="data[key]" :schema="schema" :file-path="filePath"
                @update:model-value="updateField(key, $event)" />
            </div>
          </div>
          <div class="flex justify-end px-5 py-3 border-t flex-shrink-0"
            :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
            <button type="button" @click="showModal = false"
              class="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer text-white"
              style="background: linear-gradient(135deg,#3b61ff,#1e3ef5);">
              {{ t('element.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
