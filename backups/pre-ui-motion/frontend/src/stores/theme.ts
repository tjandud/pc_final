import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export type ThemeId = 'classic-blue' | 'sky-blue' | 'navy-blue'

export interface ThemeOption {
  id: ThemeId
  label: string
  swatch: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'classic-blue', label: 'Classic Blue', swatch: '#2563eb' },
  { id: 'sky-blue', label: 'Sky Blue', swatch: '#38bdf8' },
  { id: 'navy-blue', label: 'Navy Blue', swatch: '#1e3a8a' },
]

export const useThemeStore = defineStore('theme', () => {
  const current = useLocalStorage<ThemeId>('techcompare:theme', 'classic-blue')

  function applyToDom(theme: ThemeId) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  function setTheme(theme: ThemeId) {
    if (THEME_OPTIONS.some((t) => t.id === theme)) {
      current.value = theme
      applyToDom(theme)
    }
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
    options: THEME_OPTIONS,
    setTheme,
  }
})
