import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export type ThemeId = 'dark' | 'white'

export interface ThemeOption {
  id: ThemeId
  label: string
  subLabel: string
  swatch: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Spotlight Blue',
    subLabel: 'Pitch Black (#05070A) + Electric Blue (#0096FF)',
    swatch: '#0096FF',
  },
  {
    id: 'white',
    label: 'Spotlight White',
    subLabel: 'Arctic White (#F8FAFC) + Cobalt Blue (#0077FF)',
    swatch: '#0077FF',
  },
]

export const useThemeStore = defineStore('theme', () => {
  const stored = useLocalStorage<string>('techcompare:theme', 'dark')

  const current = computed<ThemeId>({
    get: () => (stored.value === 'white' ? 'white' : 'dark'),
    set: (val) => {
      stored.value = val
    },
  })

  const isWhite = computed(() => current.value === 'white')

  function applyToDom(theme: ThemeId) {
    if (typeof document === 'undefined') return
    if (theme === 'white') {
      document.documentElement.setAttribute('data-theme', 'white')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  function setTheme(theme: ThemeId) {
    current.value = theme === 'white' ? 'white' : 'dark'
    applyToDom(current.value)
  }

  function toggleTheme() {
    setTheme(current.value === 'white' ? 'dark' : 'white')
  }

  watch(
    current,
    (val) => {
      applyToDom(val)
    },
    { immediate: true },
  )

  return {
    current,
    isWhite,
    options: THEME_OPTIONS,
    setTheme,
    toggleTheme,
  }
})
