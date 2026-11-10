import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export const api = axios.create({
  baseURL: configuredApiUrl || '/api',
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'gateguard.accessToken'
const USER_KEY = 'gateguard.user'

export type AuthUser = {
  id: string
  name: string
  email: string
  githubConnected: boolean
  githubUsername?: string
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? JSON.parse(value) as AuthUser : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && getAccessToken()) {
      clearSession()
      if (window.location.pathname.startsWith('/app')) {
        window.location.assign('/auth/login?session=expired')
      }
    }
    return Promise.reject(error)
  },
)

export const demoProjects = [
  { id: 'p1', name: 'ShopEase', repo: 'acme/shopease', branch: 'main', score: 92, coverage: 86, status: 'PASS', updated: 'Today, 10:42 AM', language: 'TypeScript' },
  { id: 'p2', name: 'TaskFlow API', repo: 'acme/taskflow-api', branch: 'develop', score: 68, coverage: 71, status: 'FAIL', updated: 'Yesterday, 4:18 PM', language: 'Node.js' },
  { id: 'p3', name: 'Portfolio Next', repo: 'nawsin/portfolio-next', branch: 'main', score: 88, coverage: 82, status: 'PASS', updated: 'Nov 05, 2026', language: 'TypeScript' },
  { id: 'p4', name: 'Campus Connect', repo: 'acme/campus-connect', branch: 'main', score: 76, coverage: 78, status: 'WARNING', updated: 'Nov 03, 2026', language: 'JavaScript' },
]

export const demoHistory = [
  { id: 'an-1048', project: 'ShopEase', date: 'Nov 08, 2026 · 10:42 AM', score: 92, coverage: '86%', issues: 4, status: 'PASS' },
  { id: 'an-1047', project: 'TaskFlow API', date: 'Nov 07, 2026 · 4:18 PM', score: 68, coverage: '71%', issues: 12, status: 'FAIL' },
  { id: 'an-1046', project: 'Portfolio Next', date: 'Nov 05, 2026 · 2:05 PM', score: 88, coverage: '82%', issues: 5, status: 'PASS' },
  { id: 'an-1045', project: 'Campus Connect', date: 'Nov 03, 2026 · 9:30 AM', score: 76, coverage: '78%', issues: 8, status: 'WARNING' },
]
