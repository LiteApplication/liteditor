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

export interface DialogOptions {
  title: string
  message?: string
  /** 'prompt' shows a text input; 'confirm' just buttons. */
  kind: 'prompt' | 'confirm'
  placeholder?: string
  initialValue?: string
  confirmLabel?: string
  danger?: boolean
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

  // Promise-based dialogs, rendered by <DialogHost />
  const dialog = ref<DialogOptions | null>(null)
  let dialogResolve: ((value: string | boolean | null) => void) | null = null

  function openDialog(opts: DialogOptions) {
    dialogResolve?.(opts.kind === 'prompt' ? null : false) // supersede any open dialog
    dialog.value = opts
    return new Promise<string | boolean | null>((resolve) => { dialogResolve = resolve })
  }

  /** Ask for a line of text. Resolves to the trimmed text, or null if cancelled/empty. */
  async function promptText(opts: Omit<DialogOptions, 'kind'>): Promise<string | null> {
    const v = await openDialog({ ...opts, kind: 'prompt' })
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }

  /** Ask for confirmation. Resolves to true only if confirmed. */
  async function confirmAction(opts: Omit<DialogOptions, 'kind'>): Promise<boolean> {
    return (await openDialog({ ...opts, kind: 'confirm' })) === true
  }

  function closeDialog(value: string | boolean | null) {
    dialog.value = null
    dialogResolve?.(value)
    dialogResolve = null
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
    dialog, promptText, confirmAction, closeDialog,
    addToast, removeToast, toggleDarkMode, toggleLocale,
  }
})
