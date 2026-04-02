<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUIStore()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
       :class="ui.darkMode ? 'bg-surface-950' : 'bg-surface-50'">

    <!-- Animated background blobs -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
           style="background: radial-gradient(circle, #3b61ff 0%, transparent 70%); animation: float 8s ease-in-out infinite;"></div>
      <div class="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
           style="background: radial-gradient(circle, #6089ff 0%, transparent 70%); animation: float 10s ease-in-out infinite reverse;"></div>
    </div>

    <!-- Card -->
    <div class="relative z-10 w-full max-w-xs px-6">

      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-transform duration-300 hover:scale-105"
             style="background: linear-gradient(135deg, #3b61ff, #1e3ef5); box-shadow: 0 0 40px rgba(59, 97, 255, 0.4);">
          <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight" :class="ui.darkMode ? 'text-white' : 'text-surface-900'">
          {{ t('login.title') }}
        </h1>
        <p class="mt-1.5 text-sm" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
          {{ t('login.subtitle') }}
        </p>
      </div>

      <!-- Auth card -->
      <div class="rounded-2xl p-6 backdrop-blur-xl border transition-all duration-300"
           :class="ui.darkMode
             ? 'bg-surface-900/80 border-surface-700/50 hover:bg-surface-900/90'
             : 'bg-white/90 border-surface-200 shadow-xl hover:bg-white'">

        <!-- Error -->
        <div v-if="auth.error" class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {{ auth.error }}
        </div>

        <button id="login-github-btn"
                @click="auth.startOAuth"
                :disabled="auth.loading"
                class="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-wait hover:scale-[1.02] active:scale-[0.98]"
                style="background: linear-gradient(135deg, #3b61ff, #1e3ef5); color: white; box-shadow: 0 4px 24px rgba(59, 97, 255, 0.35);"
                onmouseover="this.style.boxShadow='0 8px 32px rgba(59, 97, 255, 0.5)';"
                onmouseout="this.style.boxShadow='0 4px 24px rgba(59, 97, 255, 0.35)';">
          <svg v-if="!auth.loading" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ auth.loading ? t('login.loading') : t('login.cta') }}
        </button>
      </div>

      <!-- Theme/Locale row -->
      <div class="mt-5 flex items-center justify-between px-2">
        <!-- Locale select -->
        <button @click="ui.toggleLocale" class="flex flex-col items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                :class="ui.darkMode ? 'bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700' : 'bg-surface-200 text-surface-600 hover:text-surface-900 hover:bg-surface-300'"
                :title="ui.locale === 'en' ? 'Switch to French' : 'Switch to English'">
          <span class="text-xs font-bold leading-none select-none">{{ ui.locale.toUpperCase() }}</span>
        </button>

        <!-- Theme toggle -->
        <button @click="ui.toggleDarkMode" class="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                :class="ui.darkMode ? 'text-surface-400 hover:text-surface-200 bg-surface-800/50 hover:bg-surface-800' : 'text-surface-600 hover:text-surface-800 bg-surface-200/50 hover:bg-surface-200'">
          <span>{{ ui.darkMode ? '☀️' : '🌙' }}</span>
          {{ ui.darkMode ? t('lightMode') : t('darkMode') }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}
</style>
