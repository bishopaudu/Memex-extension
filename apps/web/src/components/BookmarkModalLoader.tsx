import { useState, useEffect } from 'react'
import { bookmarksApi } from '../lib/api'
import { BookmarkModal } from './BookmarkModal'

interface Props {
  bookmarkId: string
  onClose:    () => void
  onDelete:   (id: string) => void
  onTagClick: (tag: string) => void
}

export function BookmarkModalLoader({
  bookmarkId, onClose, onDelete, onTagClick
}: Props) {
  const [bookmark, setBookmark] = useState<any | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)

  useEffect(() => {
    fetchBookmark()
  }, [bookmarkId])

  async function fetchBookmark() {
    setLoading(true)
    setError(false)

    const result = await bookmarksApi.getOne(bookmarkId)

    if (result.error) {
      setError(true)
      setLoading(false)
      return
    }

    setBookmark(result.data.bookmark)
    setLoading(false)
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <div
          className="bg-surface-2 border border-surface-4 rounded-2xl
                     p-8 flex flex-col items-center gap-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-6 h-6 border-2 border-brand border-t-transparent
                          rounded-full animate-spin" />
          <p className="text-xs text-ink-3">Loading bookmark...</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error || !bookmark) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <div
          className="bg-surface-2 border border-surface-4 rounded-2xl
                     p-8 flex flex-col items-center gap-3"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-sm text-ink-2">Failed to load bookmark</p>
          <button
            onClick={fetchBookmark}
            className="text-xs text-brand-bright hover:underline"
          >
            Try again
          </button>
          <button
            onClick={onClose}
            className="text-xs text-ink-4 hover:text-ink-2"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <BookmarkModal
      bookmark={bookmark}
      onClose={onClose}
      onDelete={onDelete}
      onTagClick={onTagClick}
    />
  )
}
