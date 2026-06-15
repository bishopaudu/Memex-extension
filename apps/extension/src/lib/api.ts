const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('token')
  return result.token ?? null
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ token })
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove('token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; error: null } | { data: null; error: { code: string; message: string } }> {
  const token = await getToken()

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
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  async me() {
    return apiFetch<{ user: any }>('/api/auth/me')
  },
  async logout() {
    return apiFetch('/api/auth/logout', { method: 'POST' })
  },
}

export const bookmarksApi = {
  async update(id: string, input: {
    screenshotUrl?: string
    screenshotKey?: string
    title?: string
  }) {
    return apiFetch(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(input),
    })
  },
  async create(input: {
    url:            string
    title?:         string
    description?:   string
    faviconUrl?:    string
    ogImageUrl?:    string
    screenshotUrl?: string
    screenshotKey?: string
    tags?:          string[]
  }) {
    return apiFetch<{ bookmark: any }>('/api/bookmarks', {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  },
}

export const uploadApi = {
  async uploadScreenshot(imageDataUrl: string) {
    return apiFetch<{ url: string; publicId: string }>('/api/upload/screenshot', {
      method: 'POST',
      body:   JSON.stringify({ imageDataUrl }),
    })
  },
}

export const attachmentsApi = {
  async createScreenshot(
    bookmarkId: string,
    url: string,
    publicId: string,
    type: 'screenshot' | 'area_screenshot' = 'screenshot'
  ) {
    return apiFetch(`/api/attachments`, {
      method: 'POST',
      body:   JSON.stringify({ bookmarkId, type, url, publicId }),
    })
  },
  async createText(bookmarkId: string, content: string, label?: string) {
    return apiFetch<{ attachment: any }>('/api/attachments', {
      method: 'POST',
      body:   JSON.stringify({ type: 'text', bookmarkId, content, label }),
    })
  },

  async createAreaScreenshot(bookmarkId: string, imageDataUrl: string, label?: string) {
    return apiFetch<{ attachment: any }>('/api/attachments', {
      method: 'POST',
      body:   JSON.stringify({ type: 'area_screenshot', bookmarkId, imageDataUrl, label }),
    })
  },
}

export const tagsApi = {
  async list() {
    return apiFetch<{ items: { id: string; name: string; count: number }[] }>('/api/tags')
  },
}
