const API_BASE = 'http://localhost:3001'

export function getToken(): string | null {
  return localStorage.getItem('memex_token')
}
export function setToken(token: string): void {
  localStorage.setItem('memex_token', token)
}
export function clearToken(): void {
  localStorage.removeItem('memex_token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; error: null } | { data: null; error: { code: string; message: string } }> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

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

export const authApi = {
  async login(email: string, password: string) {
    return apiFetch<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    })
  },
  async signup(email: string, password: string, name?: string) {
    return apiFetch<{ user: any; token: string }>('/api/auth/signup', {
      method: 'POST', body: JSON.stringify({ email, password, name }),
    })
  },
  async me() { return apiFetch<{ user: any }>('/api/auth/me') },
  async logout() { return apiFetch('/api/auth/logout', { method: 'POST' }) },
}

export const bookmarksApi = {
  async list(params?: { search?: string; tag?: string; collectionId?: string; page?: number }) {
    const q = new URLSearchParams()
    if (params?.search)       q.set('search', params.search)
    if (params?.tag)          q.set('tag', params.tag)
    if (params?.collectionId) q.set('collectionId', params.collectionId)
    if (params?.page)         q.set('page', String(params.page))
    const qs = q.toString()
    return apiFetch<{ items: any[]; page: number; limit: number }>(`/api/bookmarks${qs ? `?${qs}` : ''}`)
  },
  async getOne(id: string) {
    return apiFetch<{ bookmark: any }>(`/api/bookmarks/${id}`)
  },
  async listArchived() {
    return apiFetch<{ items: any[] }>('/api/bookmarks?archived=true')
  },

  async archive(id: string) {
    return apiFetch(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify({ isArchived: true }),
    })
  },

  async unarchive(id: string) {
    return apiFetch(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify({ isArchived: false }),
    })
  },

  async delete(id: string) {
    return apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
  },
  async update(id: string, input: any) {
    return apiFetch(`/api/bookmarks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
  },
}

export const tagsApi = {
  async list() { return apiFetch<{ items: any[] }>('/api/tags') },
}

export const collectionsApi = {
  async list() { return apiFetch<{ items: any[] }>('/api/collections') },
  async getOne(id: string) {
    return apiFetch<{ collection: any }>(`/api/collections/${id}`)
  },
  async create(input: { name: string; color?: string; icon?: string; description?: string }) {
    return apiFetch<{ collection: any }>('/api/collections', {
      method: 'POST', body: JSON.stringify(input),
    })
  },
  async delete(id: string) {
    return apiFetch(`/api/collections/${id}`, { method: 'DELETE' })
  },
  async addBookmark(collectionId: string, bookmarkId: string) {
    return apiFetch(`/api/collections/${collectionId}/bookmarks`, {
      method: 'POST', body: JSON.stringify({ bookmarkId }),
    })
  },
  async removeBookmark(collectionId: string, bookmarkId: string) {
    return apiFetch(`/api/collections/${collectionId}/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    })
  },
}

export const searchApi = {
  async search(query: string) {
    return apiFetch<{
      bookmarks: any[]
      topics:    any[]
      query:     string
    }>(`/api/search?q=${encodeURIComponent(query)}`)
  },
}

export const topicsApi = {
  async list() {
    return apiFetch<{ items: any[] }>('/api/topics')
  },
  async create(input: { title: string; emoji?: string; summary?: string; coverColor?: string }) {
    return apiFetch<{ topic: any }>('/api/topics', {
      method: 'POST', body: JSON.stringify(input),
    })
  },
  async getOne(id: string) {
    return apiFetch<{ topic: any }>(`/api/topics/${id}`)
  },
  async update(id: string, input: Partial<{ title: string; emoji: string; summary: string; coverColor: string; isPublic: boolean }>) {
    return apiFetch(`/api/topics/${id}`, {
      method: 'PATCH', body: JSON.stringify(input),
    })
  },
  async delete(id: string) {
    return apiFetch(`/api/topics/${id}`, { method: 'DELETE' })
  },
  async saveBlocks(id: string, blocks: any[]) {
    return apiFetch(`/api/topics/${id}/blocks`, {
      method: 'PUT', body: JSON.stringify({ blocks }),
    })
  },
  async addReference(topicId: string, bookmarkId: string, note?: string) {
    return apiFetch(`/api/topics/${topicId}/references`, {
      method: 'POST', body: JSON.stringify({ bookmarkId, note }),
    })
  },
  async removeReference(topicId: string, bookmarkId: string) {
    return apiFetch(`/api/topics/${topicId}/references/${bookmarkId}`, {
      method: 'DELETE',
    })
  },
  async connect(fromId: string, toId: string, label?: string) {
    return apiFetch(`/api/topics/${fromId}/connections`, {
      method: 'POST', body: JSON.stringify({ toTopicId: toId, label }),
    })
  },
  async disconnect(fromId: string, toId: string) {
    return apiFetch(`/api/topics/${fromId}/connections/${toId}`, {
      method: 'DELETE',
    })
  },
}

export const graphApi = {
  async getTopicGraph() {
    return apiFetch<{
      nodes: { id: string; title: string; emoji: string; coverColor: string; refCount: number; linkCount: number }[]
      edges: { source: string; target: string; label: string | null }[]
    }>('/api/topics/graph')
  },
}
