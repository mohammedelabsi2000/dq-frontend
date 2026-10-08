import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, TOKEN_KEY } from '@/api/http'

export interface AuthUser {
  id: number
  full_name: string
  identity: string | null
  email: string | null
  gender: string | null
  role_name?: string | null
  [key: string]: any
}

interface AuthPayload {
  token?: string
  user: AuthUser
  roles: string[]
  permissions: string[]
  scopes: any[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const scopes = ref<any[]>([])
  const ready = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function apply(payload: AuthPayload) {
    user.value = payload.user
    roles.value = payload.roles ?? []
    permissions.value = payload.permissions ?? []
    scopes.value = payload.scopes ?? []
  }

  function clear() {
    token.value = null
    user.value = null
    roles.value = []
    permissions.value = []
    scopes.value = []
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(login: string, password: string) {
    const res = await api.post<AuthPayload>('auth/access-tokens', {
      login,
      password,
      device_name: 'web',
    })
    token.value = res.data.token ?? null
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    apply(res.data)
    ready.value = true
  }

  /** يُستدعى عند فتح التطبيق للتحقق من التوكن المخزّن */
  async function bootstrap() {
    if (ready.value) return
    if (token.value) {
      try {
        const res = await api.get<AuthPayload>('user')
        apply(res.data)
      } catch {
        clear()
      }
    }
    ready.value = true
  }

  async function logout() {
    try {
      await api.delete('auth/access-tokens')
    } catch {
      // التوكن قد يكون منتهياً بالفعل
    }
    clear()
  }

  /** بدون صلاحية محددة = مسموح */
  function can(permission?: string | string[] | null): boolean {
    if (!permission) return true
    const list = Array.isArray(permission) ? permission : [permission]
    return list.some((p) => permissions.value.includes(p))
  }

  return { token, user, roles, permissions, scopes, ready, isAuthenticated, login, bootstrap, logout, clear, can }
})
