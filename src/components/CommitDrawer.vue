<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const commitMessage = ref('')
const publishing = ref(false)

const stagedList = computed(() => {
  const items: Array<{ path: string; status: string; lines: string }> = []

  for (const [, file] of repo.stagedFiles) {
    if (!file) continue
    const isDirty = file.content !== file.originalContent || JSON.stringify(file.frontmatter) !== JSON.stringify(file.originalFrontmatter)
    if (isDirty) {
      let diffLines = ''
      if (file.type === 'markdown') {
        const added = (file.content ?? '').split('\n').length
        const removed = (file.originalContent ?? '').split('\n').length
        diffLines = `+${Math.max(0, added - removed)} / -${Math.max(0, removed - added)}`
      }
      items.push({
        path: file.path,
        status: file.originalContent === '' ? t('commit.statusAdded') : t('commit.statusModified'),
        lines: diffLines,
      })
    }
  }

  for (const path of repo.stagedDeletions) {
    items.push({ path, status: t('commit.statusDeleted'), lines: '' })
  }

  for (const [, carousel] of repo.stagedCarousels) {
    if (carousel.dirty) {
      items.push({ path: `${repo.config?.carousels?.[carousel.key]?.path}/carousel.json`, status: t('commit.statusModified'), lines: '' })
    }
  }

  if (repo.settingsDirty && repo.config && repo.config.settings_file) {
    items.push({
      path: repo.config.settings_file,
      status: t('commit.statusModified'),
      lines: '',
    })
  }

  return items
})

const defaultMessage = computed(() => {
  if (stagedList.value.length === 0) return ''
  const first = stagedList.value[0]
  if (stagedList.value.length === 1 && first) return `Changed ${first.path.split('/').pop() ?? first.path}`
  return `Changed ${stagedList.value.length} articles`
})

async function publish() {
  const msg = commitMessage.value.trim() || defaultMessage.value
  if (!msg) return

  publishing.value = true
  try {
    await repo.commit(msg)
    ui.addToast({ type: 'success', title: t('published'), message: `"${msg}"` })
    ui.commitDrawerOpen = false
    commitMessage.value = ''
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : 'Commit failed'
    ui.addToast({ type: 'error', title: 'Publish failed', message: err })
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex flex-col justify-end" @click.self="ui.commitDrawerOpen = false">

      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="ui.commitDrawerOpen = false"></div>

      <!-- Drawer -->
      <div class="relative z-50 rounded-t-2xl border-t max-h-[75vh] flex flex-col overflow-hidden drawer-enter-active"
        :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'">

        <!-- Handle -->
        <div class="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-200'"></div>
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 flex items-center gap-3 border-b"
          :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: linear-gradient(135deg, #3b61ff22, #3b61ff44);">
            <svg class="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-sm" :class="ui.darkMode ? 'text-surface-100' : 'text-surface-900'">{{
              t('commit.title') }}</h3>
            <p class="text-xs mt-0.5" :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
              {{ t('commit.filesWillBePublished', stagedList.length) }}
            </p>
          </div>
          <button @click="ui.commitDrawerOpen = false"
            class="p-1.5 rounded-lg transition-all duration-150 cursor-pointer hover:scale-110 active:scale-90"
            :class="ui.darkMode ? 'text-surface-400 hover:text-white hover:bg-surface-800' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Changed files list -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="stagedList.length === 0" class="text-center py-8 text-sm"
            :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
            {{ t('commit.noChanges') }}
          </div>

          <div v-else class="space-y-2">
            <div v-for="item in stagedList" :key="item.path"
              class="flex items-center gap-3 p-3 rounded-lg transition-all duration-150"
              :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-50'">
              <!-- Status dot -->
              <span class="flex-shrink-0 w-2 h-2 rounded-full"
                :class="item.status === t('commit.statusAdded') ? 'bg-green-400' : (item.status === t('commit.statusDeleted') ? 'bg-red-400' : 'bg-brand-400')"></span>

              <!-- Path -->
              <div class="flex-1 min-w-0">
                <p class="text-xs font-mono truncate" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
                  {{ item.path }}
                </p>
                <p class="text-xs mt-0.5"
                  :class="item.status === t('commit.statusAdded') ? 'text-green-400' : (item.status === t('commit.statusDeleted') ? 'text-red-400' : 'text-brand-400')">
                  {{ item.status }}
                  <span v-if="item.lines" class="ml-2 font-mono opacity-60">{{ item.lines }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Commit form -->
        <div class="flex-shrink-0 px-6 py-4 border-t space-y-3"
          :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
          <div>
            <label class="block text-xs font-medium mb-1.5"
              :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
              {{ t('commit.describeChange') }}
            </label>
            <input id="commit-message" v-model="commitMessage" type="text"
              :placeholder="defaultMessage || t('commit.messagePlaceholder')"
              class="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all duration-150" :class="ui.darkMode
                ? 'bg-surface-800 border-surface-700 text-surface-100 placeholder-surface-600 focus:border-brand-500'
                : 'bg-surface-50 border-surface-200 text-surface-900 placeholder-surface-400 focus:border-brand-400'"
              @keydown.enter="publish" />
          </div>

          <div class="flex gap-3">
            <button @click="ui.commitDrawerOpen = false"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border hover:scale-[1.02] active:scale-[0.98]"
              :class="ui.darkMode ? 'border-surface-700 text-surface-400 hover:text-white hover:border-surface-600' : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:text-surface-900'">
              {{ t('cancel') }}
            </button>
            <button id="confirm-publish-btn" @click="publish" :disabled="stagedList.length === 0 || publishing"
              class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              style="background: linear-gradient(135deg, #3b61ff, #1e3ef5); color: white;"
              :style="stagedList.length > 0 ? 'box-shadow: 0 4px 16px rgba(59,97,255,0.4)' : ''">
              <svg v-if="publishing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {{ publishing ? t('publishing') : t('publish') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
