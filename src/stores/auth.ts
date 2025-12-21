import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, LoginResponse, RegisterRequest } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setAuth(authData: LoginResponse) {
    token.value = authData.accessToken
    user.value = authData.user
    localStorage.setItem(TOKEN_KEY, authData.accessToken)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(credentials: LoginRequest): Promise<void> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const message = error.message || 'Error de autenticación'
      throw new Error(Array.isArray(message) ? message[0] : message)
    }

    const data: LoginResponse = await response.json()
    setAuth(data)
  }

  async function register(data: RegisterRequest): Promise<void> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const message = error.message || 'Error al registrar'
      throw new Error(Array.isArray(message) ? message[0] : message)
    }
  }

  function logout() {
    clearAuth()
  }

  async function loadFromStorage(): Promise<boolean> {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      return false
    }

    // Validar token con el backend
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      if (!response.ok) {
        clearAuth()
        return false
      }

      const userData: User = await response.json()
      token.value = storedToken
      user.value = userData
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    loadFromStorage,
  }
})
