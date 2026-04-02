<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const ui = useUIStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style="max-width: 360px;">
      <TransitionGroup name="toast-list">
        <div v-for="toast in ui.toasts" :key="toast.id"
             class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl toast-enter"
             :class="{
               'bg-surface-900/95 border-surface-700': true,
             }">

          <!-- Icon -->
          <div class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
               :class="{
                 'bg-green-500/20': toast.type === 'success',
                 'bg-red-500/20': toast.type === 'error',
                 'bg-brand-500/20': toast.type === 'info',
                 'bg-amber-500/20': toast.type === 'warning',
               }">
            <!-- Success -->
            <svg v-if="toast.type === 'success'" class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <!-- Error -->
            <svg v-else-if="toast.type === 'error'" class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <!-- Warning -->
            <svg v-else-if="toast.type === 'warning'" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <!-- Info -->
            <svg v-else class="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white">{{ toast.title }}</p>
            <p v-if="toast.message" class="text-xs mt-0.5 text-surface-400">{{ toast.message }}</p>
          </div>

          <!-- Dismiss -->
          <button @click="ui.removeToast(toast.id)"
                  class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-surface-500 hover:text-white transition-colors cursor-pointer mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-list-enter-active { animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-list-leave-active { animation: slideInRight 0.25s ease reverse; }
.toast-list-move { transition: transform 0.3s ease; }

@keyframes slideInRight {
  from { transform: translateX(110%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
