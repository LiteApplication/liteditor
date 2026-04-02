<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import SidebarPanel from '@/components/SidebarPanel.vue'
import EditorWorkspace from '@/components/EditorWorkspace.vue'
import CarouselEditor from '@/components/CarouselEditor.vue'
import CommitDrawer from '@/components/CommitDrawer.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const router = useRouter()

onMounted(() => {
  if (!repo.selectedRepo) {
    router.push({ name: 'repos' })
  } else {
    // Optionally poll githubActionStatus
    const pollId = setInterval(() => {
      if (repo.githubActionStatus === 'in_progress') {
        repo.fetchActionStatus()
      }
    }, 15000)
  }
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden"
       :class="ui.darkMode ? 'bg-surface-950 text-surface-50' : 'bg-surface-100 text-surface-900'">

    <!-- Top bar -->
    <header class="flex-shrink-0 h-12 flex items-center gap-3 px-4 border-b z-20"
            :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'">

      <!-- Repo name -->
      <button @click="router.push({ name: 'repos' })"
              class="flex items-center gap-2 text-sm font-medium transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              :class="ui.darkMode ? 'text-surface-300 hover:text-white' : 'text-surface-600 hover:text-surface-900'">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        {{ repo.selectedRepo?.full_name }}
      </button>

      <div class="flex-1"></div>

      <!-- Changed badge -->
      <transition name="fade">
        <span v-if="repo.hasStagedChanges"
              class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              :class="ui.darkMode ? 'bg-brand-500/15 text-brand-300' : 'bg-brand-50 text-brand-600'">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
          {{ t('editor.unsavedChanges') }}
        </span>
      </transition>

      <!-- Locale toggle -->
      <button @click="ui.toggleLocale"
              class="px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 border"
              :class="ui.darkMode ? 'text-surface-400 hover:text-white hover:bg-surface-800 border-surface-700' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100 border-surface-200'"
              :title="ui.locale === 'en' ? 'Switch to French' : 'Passer en anglais'">
        {{ ui.locale === 'en' ? '🇫🇷 FR' : '🇬🇧 EN' }}
      </button>

      <!-- GitHub Action Status Indicator -->
      <div v-if="repo.githubActionStatus" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
           :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-100'">
        <span v-if="repo.githubActionStatus === 'success'" class="text-green-500 flex items-center gap-1" title="Build Succeeded">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg> Published
        </span>
        <span v-else-if="repo.githubActionStatus === 'failure'" class="text-red-500 flex items-center gap-1" title="Please contact your developer.">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg> Error
        </span>
        <span v-else class="text-brand-500 flex items-center gap-1" title="Building...">
          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg> Deploying
        </span>
      </div>

      <!-- Dark mode toggle -->
      <button @click="ui.toggleDarkMode" class="p-1.5 rounded-lg transition-all duration-150 cursor-pointer hover:scale-110 active:scale-90"
              :class="ui.darkMode ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'">
        <svg v-if="ui.darkMode" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>

      <!-- Publish button -->
      <button id="publish-btn"
              @click="ui.commitDrawerOpen = true"
              :disabled="!repo.hasStagedChanges"
              class="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style="background: linear-gradient(135deg, #3b61ff, #1e3ef5); color: white;"
              :style="repo.hasStagedChanges ? 'box-shadow: 0 2px 16px rgba(59, 97, 255, 0.4)' : ''">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </svg>
        {{ t('editor.publish') }}
      </button>
    </header>

    <!-- Body -->
    <div class="flex-1 flex overflow-hidden">

      <!-- Sidebar -->
      <SidebarPanel />

      <!-- Main workspace -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <SettingsPanel v-if="ui.settingsOpen" />
        <CarouselEditor v-else-if="repo.activeCarouselKey" />
        <EditorWorkspace v-else />
      </div>
    </div>

    <!-- Drawers & overlays -->
    <CommitDrawer v-if="ui.commitDrawerOpen" />
    <ToastContainer />
  </div>
</template>
