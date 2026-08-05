import { defineStore } from 'pinia'
import { ref } from 'vue'

type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(
    (localStorage.getItem('theme') as Theme) || 'light',
  )

  function apply() {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
    localStorage.setItem('theme', theme.value)
  }

  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    apply()
  }

  function init() {
    apply()
  }

  return { theme, toggle, init }
})
