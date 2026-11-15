<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRepoStore, type GitHubRepo } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const repo = useRepoStore()
const ui = useUIStore()
const error = ref<string | null>(null)

onMounted(async () => {
  const owner = String(route.params.owner)
  const name = String(route.params.repo)
  try {
    const res = await auth.githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
    if (!res.ok) {
      error.value = res.status === 404 ? t('edit.notFound', { repo: `${owner}/${name}` }) : t('repos.errorLoad')
      return
    }
    await repo.selectRepo((await res.json()) as GitHubRepo)
    if (repo.configError) {
      error.value = `${t('repos.errorIncompatible')}. ${t('repos.errorContactAdmin')}`
      return
    }
    await router.replace({ name: 'editor' })
  } catch {
    error.value = t('repos.errorLoad')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center"
       :class="ui.darkMode ? 'bg-surface-950 text-surface-50' : 'bg-surface-50 text-surface-900'">
    <div v-if="error" class="text-center space-y-4 max-w-sm px-6">
      <p class="text-red-400 text-sm">{{ error }}</p>
      <button @click="router.push({ name: 'repos' })"
              class="text-sm px-4 py-2 rounded-lg font-semibold cursor-pointer text-white"
              style="background: linear-gradient(135deg, #3b61ff, #1e3ef5);">
        {{ t('edit.chooseRepo') }}
      </button>
    </div>
    <p v-else class="text-sm" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">{{ t('edit.opening') }}</p>
  </div>
</template>
