import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AdminUser {
  id: number
  username: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(t: string, u: AdminUser) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, isAuthenticated, setAuth, logout }
})
