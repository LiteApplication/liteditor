import { createI18n } from 'vue-i18n'
import en from './en'
import fr from './fr'

export type MessageSchema = typeof en

export const i18n = createI18n({
  legacy: false,
  locale: (localStorage.getItem('liteditor_locale') as 'en' | 'fr') ?? 'en',
  fallbackLocale: 'en',
  messages: { en, fr },
})

export function setLocale(locale: 'en' | 'fr') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(i18n.global as any).locale.value = locale
  localStorage.setItem('liteditor_locale', locale)
}
