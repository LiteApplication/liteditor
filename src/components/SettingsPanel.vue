<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import FieldInput from './FieldInput.vue'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const schema = computed(() => repo.config?.schema ?? {})
const keys = computed(() => Object.keys(schema.value))

function isWideField(key: string) {
  const type = schema.value[key]?.type ?? 'short-text'
  return type === 'object' || type === 'list' || type === 'long-text'
}
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div class="max-w-2xl mx-auto px-6 py-8">

      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
               style="background: linear-gradient(135deg, #3b61ff22, #3b61ff44);">
            <svg class="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold">{{ t('settings.title') }}</h2>
        </div>
        <p class="text-sm ml-11" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
          {{ t('settings.editing') }} <code class="font-mono text-brand-400 text-xs">{{ repo.config?.settings_file }}</code>
        </p>
      </div>

      <!-- No schema -->
      <div v-if="keys.length === 0"
           class="rounded-xl p-6 border text-center"
           :class="ui.darkMode ? 'border-surface-800 bg-surface-900' : 'border-surface-200 bg-white'">
        <p class="text-sm" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
          {{ t('settings.noSchema') }}
        </p>
      </div>

      <!-- Fields -->
      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div v-for="key in keys" :key="key"
             class="rounded-xl p-5 border transition-all duration-150"
             :class="[
               isWideField(key) ? 'xl:col-span-2' : 'xl:col-span-1',
               ui.darkMode ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300 shadow-sm'
             ]"
             >
          <label :for="`setting-${key}`" class="block mb-3">
            <span class="font-semibold text-sm">{{ schema[key]?.label ?? key }}</span>
            <span v-if="schema[key]?.description" class="block text-xs mt-0.5"
                  :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
              {{ schema[key]?.description }}
            </span>
          </label>
          <FieldInput
            :id="`setting-${key}`"
            :model-value="repo.settingsData[key] ?? ''"
            :schema="schema[key]!"
            @update:model-value="repo.updateSetting(key, $event)"
          />
        </div>
      </div>

      <div v-if="repo.settingsDirty" class="mt-6 flex items-center gap-2 text-xs"
           :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
        {{ t('settings.unsaved') }} <strong class="font-semibold mx-1">{{ t('settings.unsavedPublish') }}</strong> {{ t('settings.unsavedToSave') }}
      </div>
    </div>
  </div>
</template>
