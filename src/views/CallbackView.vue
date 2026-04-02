<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

const router = useRouter()
const auth = useAuthStore()
const ui = useUIStore()
const status = ref('Authenticating…')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')

  if (error) {
    status.value = `GitHub declined: ${error}`
    setTimeout(() => router.push({ name: 'login' }), 2500)
    return
  }

  if (!code || !state) {
    router.push({ name: 'login' })
    return
  }

  status.value = 'Exchanging token…'
  const success = await auth.handleCallback(code, state)

  if (success) {
    status.value = 'Success! Redirecting…'
    ui.addToast({ type: 'success', title: 'Signed in', message: `Welcome back, ${auth.user?.name ?? auth.user?.login}!` })
    await router.push({ name: 'repos' })
  } else {
    status.value = auth.error ?? 'Authentication failed'
    setTimeout(() => router.push({ name: 'login' }), 2500)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface-950">
    <div class="text-center space-y-4">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
           style="background: linear-gradient(135deg, #3b61ff, #1e3ef5);">
        <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
      <p class="text-surface-300 font-medium">{{ status }}</p>
      <p v-if="auth.error" class="text-red-400 text-sm max-w-xs">{{ auth.error }}</p>
    </div>
  </div>
</template>
