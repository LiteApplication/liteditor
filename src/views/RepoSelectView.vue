<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRepoStore, type GitHubRepo } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const repo = useRepoStore()
const ui = useUIStore()

const search = ref('')
const selecting = ref<number | null>(null)
const errorRepoId = ref<number | null>(null)

const filteredRepos = computed(() => {
  const q = search.value.toLowerCase()
  return repo.repos.filter(r =>
    r.full_name.toLowerCase().includes(q) ||
    (r.description ?? '').toLowerCase().includes(q)
  )
})

onMounted(async () => {
  await repo.fetchRepos()
})

async function selectRepo(r: GitHubRepo) {
  // Clear previous error if clicking a different repo
  if (errorRepoId.value && errorRepoId.value !== r.id) {
    errorRepoId.value = null
  }
  selecting.value = r.id
  try {
    await repo.selectRepo(r)
    if (repo.configError) {
      errorRepoId.value = r.id
      return
    }
    await router.push({ name: 'editor' })
  } catch {
    ui.addToast({ type: 'error', title: t('repos.errorLoad') })
  } finally {
    selecting.value = null
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col" :class="ui.darkMode ? 'bg-surface-950 text-surface-50' : 'bg-surface-50 text-surface-900'">

    <!-- Header -->
    <header class="border-b px-6 py-4 flex items-center gap-4"
            :class="ui.darkMode ? 'bg-surface-900/80 border-surface-800 backdrop-blur' : 'bg-white border-surface-200 shadow-sm'">
      <div class="flex items-center gap-3 flex-1">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105"
             style="background: linear-gradient(135deg, #3b61ff, #1e3ef5);">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <span class="font-bold text-lg">LiteEditor</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Locale toggle -->
        <button @click="ui.toggleLocale" class="flex flex-col items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                :class="ui.darkMode ? 'bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700' : 'bg-surface-200 text-surface-600 hover:text-surface-900 hover:bg-surface-300'"
                :title="ui.locale === 'en' ? 'Switch to French' : 'Switch to English'">
          <span class="text-xs font-bold leading-none select-none">{{ ui.locale.toUpperCase() }}</span>
        </button>

        <button @click="ui.toggleDarkMode" class="p-2 rounded-lg transition-colors cursor-pointer hover:scale-110 active:scale-95 duration-150"
                :class="ui.darkMode ? 'text-surface-400 hover:text-surface-200 hover:bg-surface-800' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'"
                :title="ui.darkMode ? t('lightMode') : t('darkMode')">
          <svg v-if="ui.darkMode" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <img :src="auth.user?.avatar_url" :alt="auth.user?.login" class="w-7 h-7 rounded-full border"
               :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'" />
          <span class="text-sm font-medium">{{ auth.user?.login }}</span>
        </div>

        <button @click="auth.logout(); $router.push({ name: 'login' })"
                class="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-150"
                :class="ui.darkMode ? 'text-surface-400 hover:text-surface-200 hover:bg-surface-800' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'">
          {{ t('signOut') }}
        </button>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <div class="mb-8">
        <h1 class="text-2xl font-bold mb-1">{{ t('repos.title') }}</h1>
        <p class="text-sm" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
          {{ t('repos.subtitle') }}
        </p>
      </div>

      <!-- Search -->
      <div class="relative mb-6 group">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
             :class="ui.darkMode ? 'text-surface-500 group-focus-within:text-brand-400' : 'text-surface-400 group-focus-within:text-brand-500'"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="search" id="repo-search" type="text" :placeholder="t('repos.search')"
               class="w-full pl-11 pr-4 py-3 rounded-xl text-sm border outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400/50"
               :class="ui.darkMode
                 ? 'bg-surface-800 border-surface-700 text-surface-100 placeholder-surface-500 focus:border-brand-500'
                 : 'bg-white border-surface-200 text-surface-900 placeholder-surface-400 focus:border-brand-500 shadow-sm'" />
      </div>

      <!-- Loading -->
      <div v-if="repo.reposLoading" class="flex items-center justify-center py-16">
        <svg class="w-8 h-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <!-- Repo List -->
      <div v-else class="space-y-2">
        <template v-for="r in filteredRepos" :key="r.id">
          <button :id="`repo-${r.id}`"
                  @click="selectRepo(r)"
                  :disabled="selecting === r.id"
                  class="w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center gap-4 group cursor-pointer active:scale-[0.99]"
                  :class="[
                    errorRepoId === r.id
                      ? 'border-red-500/40 bg-red-500/5'
                      : (ui.darkMode
                        ? 'bg-surface-900 border-surface-800 hover:border-brand-500/50 hover:bg-surface-800'
                        : 'bg-white border-surface-200 hover:border-brand-400/50 hover:shadow-md'),
                    errorRepoId === r.id ? 'rounded-b-none' : ''
                  ]">

            <!-- Icon -->
            <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                 :class="errorRepoId === r.id
                   ? 'bg-red-500/10'
                   : (ui.darkMode ? 'bg-surface-800 group-hover:bg-brand-500/10' : 'bg-surface-50 group-hover:bg-brand-50')">
              <svg v-if="selecting !== r.id" class="w-5 h-5 transition-colors"
                   :class="errorRepoId === r.id
                     ? 'text-red-400'
                     : (ui.darkMode ? 'text-surface-400 group-hover:text-brand-400' : 'text-surface-400 group-hover:text-brand-500')"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path v-if="errorRepoId !== r.id" stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <svg v-else class="w-5 h-5 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm truncate">{{ r.full_name }}</span>
                <span v-if="r.private"
                      class="text-[11px] px-1.5 py-0.5 rounded font-medium tracking-wide uppercase"
                      :class="ui.darkMode ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'">
                  {{ t('repos.private') }}
                </span>
              </div>
              <p v-if="r.description" class="text-xs mt-0.5 truncate"
                 :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
                {{ r.description }}
              </p>
            </div>

            <!-- Arrow or error indicator -->
            <svg v-if="errorRepoId !== r.id"
                 class="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                 :class="ui.darkMode ? 'text-surface-600 group-hover:text-surface-400' : 'text-surface-300 group-hover:text-surface-500'"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <!-- Inline config error panel -->
          <Transition name="slide-fade">
            <div v-if="errorRepoId === r.id"
                 class="rounded-b-xl border border-t-0 border-red-500/40 px-4 py-3 flex items-start gap-3"
                 :class="ui.darkMode ? 'bg-red-500/10' : 'bg-red-50'">
              <svg class="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-red-600 dark:text-red-400">{{ t('repos.errorIncompatible') }}</p>
                <p class="text-xs mt-0.5" :class="ui.darkMode ? 'text-red-400/80' : 'text-red-600/80'">
                  {{ t('repos.errorContactAdmin') }}
                </p>
              </div>
              <button @click.stop="errorRepoId = null"
                      class="flex-shrink-0 text-red-500/60 hover:text-red-500 transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </Transition>
        </template>

        <p v-if="filteredRepos.length === 0 && !repo.reposLoading"
           class="text-center py-10 text-sm"
           :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
          {{ t('repos.empty') }}
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
