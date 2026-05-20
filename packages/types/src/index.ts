// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

// ─────────────────────────────────────────────
// BOOKMARK
// ─────────────────────────────────────────────
export interface Bookmark {
  id: string
  userId: string
  url: string
  title: string | null
  description: string | null
  screenshotUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  isArchived: boolean
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

// What the extension sends when saving a bookmark
export interface CreateBookmarkInput {
  url: string
  title?: string
  description?: string
  screenshotBase64?: string   // raw screenshot from extension
  faviconUrl?: string
  ogImageUrl?: string
  tags?: string[]             // tag names (we resolve IDs server-side)
}

// What's returned in list responses (lighter than full Bookmark)
export interface BookmarkSummary {
  id: string
  url: string
  title: string | null
  screenshotUrl: string | null
  faviconUrl: string | null
  tags: Tag[]
  createdAt: string
}

// ─────────────────────────────────────────────
// TAG
// ─────────────────────────────────────────────
export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface CreateTagInput {
  name: string
  color?: string
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────

// Every API response is wrapped in this shape
// This makes error handling consistent everywhere
export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// Paginated list responses
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export interface AuthResponse {
  user: User
  token: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  email: string
  password: string
  name?: string
}
