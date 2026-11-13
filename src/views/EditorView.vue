<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import AppHeader from '@/components/AppHeader.vue'
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
    setInterval(() => {
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

    <AppHeader compact>
      <template #left>
        <button @click="router.push({ name: 'repos' })" :title="repo.selectedRepo?.full_name"
                class="flex items-center gap-1.5 min-w-0 max-w-64 text-sm font-medium transition-colors duration-150 cursor-pointer"
                :class="ui.darkMode ? 'text-surface-300 hover:text-white' : 'text-surface-600 hover:text-surface-900'">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          <span class="truncate">{{ repo.selectedRepo?.full_name }}</span>
        </button>
      </template>
      <template #actions>
        <!-- Deploy status (icon only, details on hover) -->
        <span v-if="repo.githubActionStatus" class="flex items-center justify-center w-7 h-7 rounded-full"
              :class="repo.githubActionStatus === 'success' ? 'text-green-500 bg-green-500/10'
                : repo.githubActionStatus === 'failure' ? 'text-red-500 bg-red-500/10' : 'text-brand-500 bg-brand-500/10'"
              :title="repo.githubActionStatus === 'success' ? 'Published'
                : repo.githubActionStatus === 'failure' ? 'Build failed. Please contact your developer.' : 'Deploying…'">
          <svg v-if="repo.githubActionStatus === 'success'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else-if="repo.githubActionStatus === 'failure'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </span>

        <!-- Publish (dot = unsaved changes) -->
        <button id="publish-btn"
                @click="ui.commitDrawerOpen = true"
                :disabled="!repo.hasStagedChanges"
                :title="repo.hasStagedChanges ? t('editor.unsavedChanges') : ''"
                class="relative flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style="background: linear-gradient(135deg, #3b61ff, #1e3ef5); color: white;"
                :style="repo.hasStagedChanges ? 'box-shadow: 0 2px 16px rgba(59, 97, 255, 0.4)' : ''">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
          {{ t('editor.publish') }}
          <span v-if="repo.hasStagedChanges"
                class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 animate-pulse"
                :class="ui.darkMode ? 'ring-surface-900' : 'ring-white'"></span>
        </button>
      </template>
    </AppHeader>

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
