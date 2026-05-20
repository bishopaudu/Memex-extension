const API_BASE = 'http://localhost:3001'

// Web app uses localStorage for token persistence
// (Extension uses chrome.storage — same concept, different API)
export function getToken(): string | null {
  return localStorage.getItem('memex_token')
}

export function setToken(token: string): void {
  localStorage.setItem('memex_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('memex_token')
}

// ─────────────────────────────────────────────
// Core fetch wrapper — identical logic to extension
// In a larger codebase this would live in @memex/types
// For now we duplicate it — acceptable at this stage
// ─────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; error: null } | { data: null; error: { code: string; message: string } }> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    const json = await response.json()

    if (!response.ok) {
      return { data: null, error: json.error ?? { code: 'UNKNOWN', message: 'Something went wrong' } }
    }

    return { data: json.data, error: null }
  } catch {
    return { data: null, error: { code: 'NETWORK_ERROR', message: 'Cannot reach Memex server' } }
  }
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    return apiFetch<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async signup(email: string, password: string, name?: string) {
    return apiFetch<{ user: any; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  },

  async me() {
    return apiFetch<{ user: any }>('/api/auth/me')
  },

  async logout() {
    return apiFetch('/api/auth/logout', { method: 'POST' })
  },
}

// ─────────────────────────────────────────────
// Bookmarks
// ─────────────────────────────────────────────
export const bookmarksApi = {
  async list(params?: { search?: string; tag?: string; page?: number }) {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.tag)    query.set('tag', params.tag)
    if (params?.page)   query.set('page', String(params.page))

    const qs = query.toString()
    return apiFetch<{ items: any[]; page: number; limit: number }>(`/api/bookmarks${qs ? `?${qs}` : ''}`)
  },

  async create(input: any) {
    return apiFetch<{ bookmark: any }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async delete(id: string) {
    return apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
  },

  async update(id: string, input: any) {
    return apiFetch(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
}

// ─────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────
export const tagsApi = {
  async list() {
    return apiFetch<{ items: any[] }>('/api/tags')
  },
}
