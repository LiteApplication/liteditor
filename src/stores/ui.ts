import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setLocale } from '@/i18n'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export const useUIStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  const darkMode = ref(localStorage.getItem('liteditor_theme') !== 'light')
  const commitDrawerOpen = ref(false)
  const assetsOpen = ref(false)
  const settingsOpen = ref(false)
  const locale = ref<'en' | 'fr'>((localStorage.getItem('liteditor_locale') as 'en' | 'fr') ?? 'en')

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, duration: 4000, ...toast })
    setTimeout(() => removeToast(id), toast.duration ?? 4000)
  }

  function removeToast(id: string) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    localStorage.setItem('liteditor_theme', darkMode.value ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  function toggleLocale() {
    const next = locale.value === 'en' ? 'fr' : 'en'
    locale.value = next
    setLocale(next)
  }

  // Init theme
  document.documentElement.classList.toggle('dark', darkMode.value)

  return {
    toasts, darkMode, commitDrawerOpen, assetsOpen, settingsOpen, locale,
    addToast, removeToast, toggleDarkMode, toggleLocale,
  }
})
