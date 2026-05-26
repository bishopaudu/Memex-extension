import { useState, useEffect, useRef } from 'react'
import { searchApi } from '../lib/api'

interface Props {
  onClose:       () => void
  onOpenBookmark: (id: string) => void
  onOpenTopic:   (id: string) => void
}

type Tab = 'bookmarks' | 'wiki'

export function SearchModal({ onClose, onOpenBookmark, onOpenTopic }: Props) {
  const [query,     setQuery]     = useState('')
  const [tab,       setTab]       = useState<Tab>('bookmarks')
  const [results,   setResults]   = useState<{ bookmarks: any[]; topics: any[] }>({
    bookmarks: [], topics: []
  })
  const [loading,   setLoading]   = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounce    = useRef<any>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)

    if (query.length < 2) {
      setResults({ bookmarks: [], topics: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    debounce.current = setTimeout(async () => {
      const r = await searchApi.search(query)
      if (!r.error) setResults(r.data)
      setLoading(false)
    }, 300)
  }, [query])

  // Highlight matching text in result
  function highlight(text: string, query: string): React.ReactNode {
    if (!text || !query) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-brand/30 text-brand-bright rounded px-0.5">{part}</mark>
        : part
    )
  }

  const totalResults = results.bookmarks.length + results.topics.length
  const hasQuery     = query.length >= 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-2 border border-surface-4
                   rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4">
          <svg className="w-4 h-4 text-ink-3 flex-shrink-0" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search bookmarks, wiki topics, notes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink-1 placeholder-ink-4
                       outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-brand border-t-transparent
                            rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="text-[10px] text-ink-4 px-1.5 py-0.5 bg-surface-3
                          border border-surface-4 rounded">Esc</kbd>
        </div>

        {/* Tabs */}
        {hasQuery && (
          <div className="flex border-b border-surface-4">
            {([
              { key: 'bookmarks', label: 'Bookmarks', count: results.bookmarks.length },
              { key: 'wiki',      label: 'Wiki',      count: results.topics.length },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs relative
                            transition-colors
                            ${tab === t.key
                              ? 'text-brand-bright bg-brand/5'
                              : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
              >
                {t.label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full
                                  ${tab === t.key
                                    ? 'bg-brand/20 text-brand-bright'
                                    : 'bg-surface-4 text-ink-4'}`}>
                  {t.count}
                </span>
                {tab === t.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">

          {/* Empty / initial state */}
          {!hasQuery && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-8 h-8 text-ink-5 mb-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-sm text-ink-3 mb-1">Search your knowledge base</p>
              <p className="text-xs text-ink-5">
                Searches bookmarks, wiki topics, and notes
              </p>
            </div>
          )}

          {/* No results */}
          {hasQuery && !loading && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-ink-3 mb-1">No results for "{query}"</p>
              <p className="text-xs text-ink-5">Try different keywords</p>
            </div>
          )}

          {/* Bookmark results */}
          {tab === 'bookmarks' && results.bookmarks.length > 0 && (
            <div className="py-1">
              {results.bookmarks.map(b => {
                let domain = ''
                try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}

                return (
                  <button
                    key={b.id}
                    onClick={() => { onOpenBookmark(b.id); onClose() }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-3
                               transition-colors text-left group"
                  >
                    {/* Favicon */}
                    <div className="w-8 h-8 bg-surface-3 rounded-lg border border-surface-4
                                    flex items-center justify-center flex-shrink-0 overflow-hidden
                                    mt-0.5">
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

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-1 truncate
                                    group-hover:text-brand-bright transition-colors">
                        {highlight(b.title ?? domain, query)}
                      </p>
                      <p className="text-[11px] text-ink-4 truncate mt-0.5">{domain}</p>
                      {b.snippet && (
                        <p className="text-[11px] text-ink-3 mt-1 line-clamp-2 leading-relaxed">
                          {highlight(b.snippet, query)}
                        </p>
                      )}
                      {b.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {b.tags.slice(0, 3).map((tag: any) => (
                            <span key={tag.id}
                                  className="text-[9px] px-1.5 py-0.5 bg-brand/10
                                             text-brand-bright rounded-full">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <svg className="w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3
                                    transition-colors flex-shrink-0 mt-1"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          )}

          {/* Wiki results */}
          {tab === 'wiki' && results.topics.length > 0 && (
            <div className="py-1">
              {results.topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => { onOpenTopic(topic.id); onClose() }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-3
                             transition-colors text-left group"
                >
                  {/* Topic icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center
                               flex-shrink-0 text-lg mt-0.5"
                    style={{ background: topic.coverColor + '20',
                             border: `1px solid ${topic.coverColor}30` }}
                  >
                    {topic.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-1 truncate
                                  group-hover:text-brand-bright transition-colors">
                      {highlight(topic.title, query)}
                    </p>
                    {topic.snippet && (
                      <p className="text-[11px] text-ink-3 mt-1 line-clamp-2 leading-relaxed">
                        {highlight(topic.snippet, query)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-ink-5">
                        {topic.blockCount} blocks
                      </span>
                      <span className="text-[9px] text-ink-5">
                        {topic.refCount} references
                      </span>
                    </div>
                  </div>

                  <svg className="w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3
                                  transition-colors flex-shrink-0 mt-1"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {hasQuery && totalResults > 0 && (
          <div className="px-4 py-2 border-t border-surface-4 flex items-center gap-3">
            <span className="text-[10px] text-ink-5">
              {totalResults} result{totalResults > 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-ink-5 ml-auto">
              Click to open · Esc to close
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
