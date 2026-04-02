// GitHub OAuth via Gatekeeper proxy + Auth store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string
const REDIRECT_URI = `${window.location.origin}/callback`
const SCOPES = 'repo read:user'

// Random state for CSRF protection
function generateState(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => chars[b % chars.length]).join('')
}

// Store
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('liteditor_token'))
  const user = ref<GitHubUser | null>(JSON.parse(localStorage.getItem('liteditor_user') || 'null'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)

  // ── Step 1: redirect to GitHub ──────────────────────────────────────────────
  function startOAuth() {
    const state = generateState()
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state,
    })
    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  // ── Step 2: handle callback, exchange code via Gatekeeper ──────────────────
  async function handleCallback(code: string, state: string): Promise<boolean> {
    const savedState = sessionStorage.getItem('oauth_state')

    if (state !== savedState) {
      error.value = 'Invalid OAuth state. Please try again.'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Gatekeeper: GET /authenticate/<code> → { token: "..." }
      const gatekeeperBase = (import.meta.env.VITE_TOKEN_PROXY_URL as string).replace(/\/$/, '')
      const res = await fetch(`${gatekeeperBase}/${code}`)

      if (!res.ok) throw new Error(`Gatekeeper error: ${res.status}`)

      const data = await res.json() as { token?: string; error?: string }

      if (data.error || !data.token) {
        throw new Error(data.error ?? 'No token returned by Gatekeeper')
      }

      accessToken.value = data.token
      localStorage.setItem('liteditor_token', data.token)
      sessionStorage.removeItem('oauth_state')

      await fetchUser()
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Fetch GitHub user profile ───────────────────────────────────────────────
  async function fetchUser() {
    if (!accessToken.value) return
    const res = await githubFetch('/user')
    if (res.ok) {
      const data = await res.json() as GitHubUser
      user.value = data
      localStorage.setItem('liteditor_user', JSON.stringify(data))
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  function logout() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('liteditor_token')
    localStorage.removeItem('liteditor_user')
  }

  // ── Authenticated GitHub API fetch ──────────────────────────────────────────
  function githubFetch(path: string, options: RequestInit = {}) {
    const url = path.startsWith('http') ? path : `https://api.github.com${path}`
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    })
  }

  return {
    accessToken, user, loading, error, isAuthenticated,
    startOAuth, handleCallback, logout, githubFetch,
  }
})

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}
