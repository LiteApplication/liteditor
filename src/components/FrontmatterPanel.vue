<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import FieldInput from './FieldInput.vue'
import type { FieldSchema } from '@/types/schema'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const file = computed(() => repo.activeFile)

// Use config schema if present; fall back to keys from the actual frontmatter
const effectiveSchema = computed<Record<string, FieldSchema>>(() => {
  const configSchema = repo.config?.frontmatter ?? {}
  if (Object.keys(configSchema).length > 0) return configSchema
  // Auto-generate schema from whatever keys exist in the file's frontmatter
  const fm = file.value?.frontmatter ?? {}
  return Object.fromEntries(
    Object.keys(fm).map(key => {
      const val = fm[key]
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      if (Array.isArray(val)) {
        return [key, { label, type: 'list', itemSchema: { label: '', type: 'short-text' } } satisfies FieldSchema]
      }
      const type = typeof val === 'boolean' ? 'boolean' : 'short-text'
      return [key, { label, type } satisfies FieldSchema]
    }),
  )
})

const keys = computed(() => Object.keys(effectiveSchema.value))
const hasAnything = computed(() => keys.value.length > 0 || Object.keys(file.value?.frontmatter ?? {}).length > 0)

function getValue(key: string): unknown {
  return file.value?.frontmatter?.[key] ?? ''
}

function setValue(key: string, val: unknown) {
  if (!file.value) return
  repo.updateFrontmatter(file.value.path, key, val)
}
</script>

<template>
  <div class="h-full flex flex-col border-l overflow-hidden"
       :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-surface-50 border-surface-200'">

    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b"
         :class="ui.darkMode ? 'border-surface-800' : 'border-surface-200'">
      <h3 class="text-sm font-semibold">{{ t('frontmatter.title') }}</h3>
      <p class="text-xs mt-0.5" :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
        {{ file?.path.split('/').pop() }}
      </p>
    </div>

    <!-- No frontmatter at all -->
    <div v-if="!hasAnything" class="flex-1 flex items-center justify-center p-4 text-center">
      <div>
        <svg class="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="text-xs" :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
          {{ t('frontmatter.noDetails') }}
        </p>
      </div>
    </div>

    <!-- Fields -->
    <div v-else class="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <div v-for="key in keys" :key="key">
        <label :for="`fm-${key}`" class="block mb-1.5">
          <span class="text-xs font-semibold"
                :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
            {{ effectiveSchema[key]?.label ?? key }}
          </span>
          <span v-if="effectiveSchema[key]?.description" class="block text-xs mt-0.5"
                :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
            {{ effectiveSchema[key]?.description }}
          </span>
        </label>
        <FieldInput
          :id="`fm-${key}`"
          :model-value="getValue(key)"
          :schema="effectiveSchema[key]!"
          :file-path="file?.path"
          @update:model-value="setValue(key, $event)"
        />
      </div>
    </div>
  </div>
</template>
