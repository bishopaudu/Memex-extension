import { useState, useEffect } from 'react'
import { readingApi } from '../lib/api'

interface Props {
  onOpenBookmark: (id: string) => void
}

type Filter = 'unread' | 'read' | 'all'

export function ReadingListPage({ onOpenBookmark }: Props) {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('unread')

  useEffect(() => { fetchList() }, [filter])

  async function fetchList() {
    setLoading(true)
    const r = await readingApi.list(filter)
    if (!r.error) setItems(r.data.items)
    setLoading(false)
  }

  async function markRead(bookmarkId: string, isRead: boolean) {
    setItems(prev => prev.map(i =>
      i.bookmark.id === bookmarkId ? { ...i, isRead } : i
    ))
    await readingApi.markRead(bookmarkId, isRead)
    if (filter !== 'all') fetchList()
  }

  async function removeFromList(bookmarkId: string) {
    setItems(prev => prev.filter(i => i.bookmark.id !== bookmarkId))
    await readingApi.remove(bookmarkId)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* Header */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span>Memex</span>
          <span className="text-ink-5">/</span>
          <span className="text-ink-1 font-medium">📖 Reading list</span>
        </div>

        {/* Filter tabs */}
        <div className="ml-auto flex items-center gap-0.5 bg-surface-3
                        rounded-lg p-0.5">
          {(['unread', 'read', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[10px] rounded-md capitalize transition-colors
                          ${filter === f
                            ? 'bg-surface-2 text-ink-1 font-medium shadow-sm'
                            : 'text-ink-4 hover:text-ink-2'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-sm font-semibold text-ink-1">Reading list</h1>
            <p className="text-[11px] text-ink-4 mt-0.5">
              {items.length} {filter === 'all' ? '' : filter}{' '}
              {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">📖</div>
            <p className="text-sm font-medium text-ink-2 mb-1">
              {filter === 'read' ? 'Nothing read yet' : 'Reading list is empty'}
            </p>
            <p className="text-xs text-ink-4 max-w-xs">
              {filter === 'read'
                ? 'Mark items as read and they will appear here'
                : 'Add bookmarks to your reading list to read them later'}
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((item: any) => {
              const b = item.bookmark
              let domain = ''
              try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}

              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl border
                              transition-all
                              ${item.isRead
                                ? 'bg-surface-2 border-surface-4 opacity-60'
                                : 'bg-surface-2 border-surface-4 hover:border-brand/30'}`}
                >
                  {/* Read indicator */}
                  <button
                    onClick={() => markRead(b.id, !item.isRead)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center
                                justify-center flex-shrink-0 transition-colors
                                ${item.isRead
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-surface-5 hover:border-brand'}`}
                    title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    {item.isRead && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>

                  {/* Favicon */}
                  {b.faviconUrl && (
                    <img src={b.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
                         onError={e => (e.currentTarget.style.display = 'none')} />
                  )}

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onOpenBookmark(b.id)}
                  >
                    <p className={`text-xs font-medium truncate hover:text-brand-bright
                                   transition-colors
                                   ${item.isRead ? 'text-ink-3 line-through' : 'text-ink-1'}`}>
                      {b.title ?? domain}
                    </p>
                    <p className="text-[10px] text-ink-4 truncate">{domain}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1">
                    {(b.tags ?? []).slice(0, 2).map((tag: any) => (
                      <span key={tag.id}
                            className="text-[9px] px-1.5 py-0.5 bg-brand/10
                                       text-brand-bright rounded-full">
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromList(b.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center
                               justify-center text-ink-4 hover:text-red-400 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
