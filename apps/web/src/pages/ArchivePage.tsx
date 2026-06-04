import { useState, useEffect } from 'react'
import { bookmarksApi } from '../lib/api'

interface Props {
  onOpenBookmark: (id: string) => void
}

export function ArchivePage({ onOpenBookmark }: Props) {
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  useEffect(() => { fetchArchived() }, [])

  async function fetchArchived() {
    setLoading(true)
    const r = await bookmarksApi.listArchived()
    if (!r.error) setBookmarks(r.data.items)
    setLoading(false)
  }

  async function handleUnarchive(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    await bookmarksApi.unarchive(id)
  }

  async function handleDelete(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    await bookmarksApi.delete(id)
  }

  const filtered = bookmarks.filter(b =>
    !search ||
    (b.title ?? b.url).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* Top bar */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span>Memex</span>
          <span className="text-ink-5">/</span>
          <span className="text-ink-1 font-medium flex items-center gap-1.5">
            📦 Archive
          </span>
        </div>

        <div className="ml-auto relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search archive..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4
                       rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                       focus:border-brand transition-colors"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-sm font-semibold text-ink-1">Archive</h1>
            <p className="text-[11px] text-ink-4 mt-0.5">
              {bookmarks.length} archived {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          </div>

          {bookmarks.length > 0 && (
            <p className="text-[11px] text-ink-4">
              Restore to move back to your library
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}

        {!loading && bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 bg-surface-3 border border-surface-4 rounded-2xl
                            flex items-center justify-center text-2xl mb-4">
              📦
            </div>
            <p className="text-sm font-medium text-ink-2 mb-1">Archive is empty</p>
            <p className="text-xs text-ink-4 max-w-xs">
              Bookmarks you archive will appear here.
              Right-click any bookmark card to archive it.
            </p>
          </div>
        )}

        {!loading && filtered.length === 0 && bookmarks.length > 0 && (
          <p className="text-xs text-ink-4 text-center py-8">
            No archived bookmarks match "{search}"
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-2">
            {filtered.map(b => {
              let domain = ''
              try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}

              function timeAgo(date: string) {
                const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
                if (s < 86400) return `${Math.floor(s / 3600)}h ago`
                if (s < 604800) return `${Math.floor(s / 86400)}d ago`
                return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }

              return (
                <div
                  key={b.id}
                  className="group flex items-center gap-3 p-3 bg-surface-2
                             border border-surface-4 rounded-xl hover:border-surface-5
                             transition-colors"
                >
                  {/* Favicon */}
                  <div className="w-8 h-8 bg-surface-3 border border-surface-4
                                  rounded-lg flex items-center justify-center flex-shrink-0">
                    {b.faviconUrl ? (
                      <img src={b.faviconUrl} alt="" className="w-5 h-5 object-contain"
                           onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <svg className="w-4 h-4 text-ink-4" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={1.5}>
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onOpenBookmark(b.id)}
                  >
                    <p className="text-xs font-medium text-ink-1 truncate
                                  hover:text-brand-bright transition-colors">
                      {b.title ?? domain}
                    </p>
                    <p className="text-[10px] text-ink-4 truncate">{domain}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(b.tags ?? []).slice(0, 2).map((tag: any) => (
                      <span key={tag.id}
                            className="text-[9px] px-1.5 py-0.5 bg-surface-3
                                       text-ink-4 rounded-full">
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  {/* Date */}
                  <span className="text-[10px] text-ink-5 flex-shrink-0">
                    {timeAgo(b.createdAt)}
                  </span>

                  {/* Actions — visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                                  transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleUnarchive(b.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px]
                                 text-green-400 hover:bg-green-400/10 rounded-lg
                                 transition-colors"
                      title="Restore to library"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={2}>
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                      </svg>
                      Restore
                    </button>

                    <button
                      onClick={() => handleDelete(b.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px]
                                 text-red-400 hover:bg-red-400/10 rounded-lg
                                 transition-colors"
                      title="Delete permanently"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
