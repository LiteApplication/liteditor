<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUIStore()
const value = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const confirmRef = ref<HTMLButtonElement | null>(null)

watch(() => ui.dialog, async (d) => {
  if (!d) return
  value.value = d.initialValue ?? ''
  await nextTick()
  if (d.kind === 'prompt') {
    inputRef.value?.focus()
    inputRef.value?.select()
  } else {
    confirmRef.value?.focus()
  }
})

function cancel() { ui.closeDialog(null) }
function submit() {
  const d = ui.dialog
  if (!d) return
  ui.closeDialog(d.kind === 'prompt' ? value.value : true)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="ui.dialog" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
           @keydown.esc.stop="cancel">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancel"></div>
        <form role="dialog" aria-modal="true" @submit.prevent="submit"
              class="relative w-full max-w-sm rounded-2xl border overflow-hidden"
              :class="ui.darkMode ? 'bg-surface-900 border-surface-700 shadow-2xl' : 'bg-white border-surface-200 shadow-2xl'">
          <div class="px-5 pt-5 pb-4">
            <div v-if="ui.dialog.danger" class="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-red-500/15 text-red-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-base font-semibold">{{ ui.dialog.title }}</h3>
            <p v-if="ui.dialog.message" class="mt-1 text-sm break-words"
               :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">{{ ui.dialog.message }}</p>
            <input v-if="ui.dialog.kind === 'prompt'" ref="inputRef" v-model="value" type="text"
                   :placeholder="ui.dialog.placeholder"
                   class="mt-4 w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-400/50"
                   :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500'
                     : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400'" />
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t"
               :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
            <button type="button" @click="cancel"
                    class="px-4 py-2 rounded-lg text-sm border cursor-pointer transition-all duration-150"
                    :class="ui.darkMode ? 'border-surface-700 text-surface-300 hover:bg-surface-800' : 'border-surface-200 text-surface-600 hover:bg-surface-50'">
              {{ t('cancel') }}
            </button>
            <button ref="confirmRef" type="submit"
                    :disabled="ui.dialog.kind === 'prompt' && !value.trim()"
                    class="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    :style="ui.dialog.danger ? 'background: linear-gradient(135deg,#ef4444,#dc2626)' : 'background: linear-gradient(135deg,#3b61ff,#1e3ef5)'">
              {{ ui.dialog.confirmLabel ?? t('apply') }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
