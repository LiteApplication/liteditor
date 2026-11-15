<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import FieldInput from './FieldInput.vue'

const props = defineProps<{ name: string; data: Record<string, unknown>; filePath?: string }>()
const emit = defineEmits<{ 'update:data': [Record<string, unknown>]; close: [] }>()

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const config = computed(() => repo.config?.elements?.[props.name])
const fieldEntries = computed(() => Object.entries(config.value?.fields ?? {}))
</script>

<template>
  <Teleport to="body">
    <div v-if="config" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')"></div>
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
              @update:model-value="emit('update:data', { ...data, [key]: $event })" />
          </div>
        </div>
        <div class="flex justify-end px-5 py-3 border-t flex-shrink-0"
          :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
          <button type="button" @click="emit('close')"
            class="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer text-white"
            style="background: linear-gradient(135deg,#3b61ff,#1e3ef5);">
            {{ t('element.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
