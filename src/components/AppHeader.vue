<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import AppLogo from './AppLogo.vue'

// Shared top bar: logo, optional `left` content, `actions` slot, then the
// locale toggle, dark-mode toggle and user menu.
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const ui = useUIStore()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) userMenuOpen.value = false
}
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') userMenuOpen.value = false
}
function signOut() {
  userMenuOpen.value = false
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <header class="flex-shrink-0 h-14 border-b px-4 sm:px-6 flex items-center gap-3 z-20"
          :class="ui.darkMode ? 'bg-surface-900/80 border-surface-800 backdrop-blur' : 'bg-white border-surface-200 shadow-sm'">
    <div class="flex items-center gap-3">
      <AppLogo class="w-8 h-8 rounded-lg transition-transform hover:scale-105" />
      <span v-if="!compact" class="font-bold text-lg">LiteEditor</span>
    </div>

    <template v-if="$slots.left">
      <div class="w-px h-5" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-200'"></div>
      <slot name="left" />
    </template>

    <div class="flex-1"></div>

    <slot name="actions" />

    <!-- Language + theme -->
    <div class="flex items-center gap-0.5 p-0.5 rounded-full" :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-100'">
      <!-- Locale toggle -->
      <button @click="ui.toggleLocale"
              class="flex items-center justify-center h-7 px-2 rounded-full transition-colors duration-150 cursor-pointer"
              :class="ui.darkMode ? 'text-surface-300 hover:text-white hover:bg-surface-700' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200'"
              :title="ui.locale === 'en' ? 'Switch to French' : 'Switch to English'">
        <span class="text-xs font-bold leading-none select-none">{{ ui.locale.toUpperCase() }}</span>
      </button>

      <!-- Dark mode toggle -->
      <button @click="ui.toggleDarkMode"
              class="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 cursor-pointer"
              :class="ui.darkMode ? 'text-surface-400 hover:text-white hover:bg-surface-700' : 'text-surface-500 hover:text-surface-900 hover:bg-surface-200'"
              :title="ui.darkMode ? t('lightMode') : t('darkMode')">
        <svg v-if="ui.darkMode" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>
    </div>

    <!-- User menu -->
    <div ref="userMenuRef" class="relative">
      <button type="button" @click="userMenuOpen = !userMenuOpen" aria-haspopup="menu" :aria-expanded="userMenuOpen"
              class="flex items-center gap-1 p-0.5 pr-1.5 rounded-full transition-colors cursor-pointer duration-150"
              :class="ui.darkMode ? 'hover:bg-surface-800' : 'hover:bg-surface-100'"
              :title="auth.user?.login">
        <img :src="auth.user?.avatar_url" :alt="auth.user?.login" class="w-7 h-7 rounded-full border"
             :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'" />
        <svg class="w-3.5 h-3.5 transition-transform duration-150" :class="userMenuOpen ? 'rotate-180' : ''"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="userMenuOpen" role="menu"
           class="absolute right-0 mt-2 min-w-44 rounded-xl border py-1 z-30 shadow-xl"
           :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200'">
        <div class="px-4 py-2 text-xs border-b mb-1" :class="ui.darkMode ? 'border-surface-800 text-surface-400' : 'border-surface-100 text-surface-500'">
          {{ auth.user?.login }}
        </div>
        <button type="button" role="menuitem" @click="signOut"
                class="w-full text-left text-sm px-4 py-2 cursor-pointer transition-colors duration-150"
                :class="ui.darkMode ? 'text-surface-300 hover:bg-surface-800 hover:text-white' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'">
          {{ t('signOut') }}
        </button>
      </div>
    </div>
  </header>
</template>
