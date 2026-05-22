import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { bookmarksApi, tagsApi, collectionsApi } from '../lib/api'
import { BookmarkCard } from '../components/BookmarkCard'
import { Sidebar }      from '../components/Sidebar'
import { ThemeToggle }  from '../components/ThemeToggle'

interface Props {
  theme:       'dark' | 'light'
  toggleTheme: () => void
}

export function DashboardPage({ theme, toggleTheme }: Props) {
  const { auth, logout } = useAuth()

  const [bookmarks,   setBookmarks]   = useState<any[]>([])
  const [tags,        setTags]        = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [activeTag,   setActiveTag]   = useState('')
  const [activeCollection, setActiveCollection] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState<'grid' | 'list'>('grid')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { fetchBookmarks() }, [debouncedSearch, activeTag, activeCollection])
  useEffect(() => { fetchTags(); fetchCollections() }, [])

  async function fetchBookmarks() {
    setLoading(true)
    const result = await bookmarksApi.list({
      search:       debouncedSearch,
      tag:          activeTag,
      collectionId: activeCollection,
    })
    if (!result.error) setBookmarks(result.data.items)
    setLoading(false)
  }

  async function fetchTags() {
    const result = await tagsApi.list()
    if (!result.error) setTags(result.data.items)
  }

  async function fetchCollections() {
    const result = await collectionsApi.list()
    if (!result.error) setCollections(result.data.items)
  }

  async function handleDelete(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    const result = await bookmarksApi.delete(id)
    if (result.error) fetchBookmarks()
    else fetchTags()
  }

  function handleTagClick(tag: string) {
    setActiveTag(tag)
    setActiveCollection('')
    setSearch('')
  }

  function handleCollectionClick(id: string) {
    setActiveCollection(id)
    setActiveTag('')
    setSearch('')
  }

  const user = auth.status === 'authenticated' ? auth.user : null

  const activeCollectionName = collections.find(c => c.id === activeCollection)?.name

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        tags={tags}
        collections={collections}
        activeTag={activeTag}
        activeCollection={activeCollection}
        bookmarkCount={bookmarks.length}
        onTagClick={handleTagClick}
        onCollectionClick={handleCollectionClick}
        onCollectionsChange={fetchCollections}
        userEmail={user?.email ?? ''}
        onLogout={logout}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

        {/* Top bar */}
        <header className="h-12 border-b border-surface-4 flex items-center
                           gap-3 px-5 flex-shrink-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span>Memex</span>
            {activeCollection && (
              <>
                <span className="text-ink-5">/</span>
                <span className="text-ink-2">{activeCollectionName}</span>
              </>
            )}
            {activeTag && (
              <>
                <span className="text-ink-5">/</span>
                <span className="text-brand-bright">#{activeTag}</span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md ml-4">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveTag(''); setActiveCollection('') }}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-3 border border-surface-4
                           rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                           focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5 ml-auto">
            <button
              onClick={() => setView('grid')}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors
                          ${view === 'grid' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors
                          ${view === 'list' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">

          {/* Active filter pills */}
          {(activeTag || debouncedSearch) && (
            <div className="flex items-center gap-2 mb-4">
              {activeTag && (
                <span className="flex items-center gap-1 px-2 py-1 bg-brand/10
                                 text-brand-bright text-xs rounded-full border border-brand/20">
                  #{activeTag}
                  <button onClick={() => setActiveTag('')}
                          className="hover:text-white transition-colors ml-0.5">×</button>
                </span>
              )}
              {debouncedSearch && (
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-3
                                 text-ink-2 text-xs rounded-full border border-surface-4">
                  "{debouncedSearch}"
                  <button onClick={() => setSearch('')}
                          className="hover:text-ink-1 transition-colors ml-0.5">×</button>
                </span>
              )}
            </div>
          )}

          {/* Count */}
          {!loading && (
            <p className="text-[11px] text-ink-4 mb-4">
              {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent
                              rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && bookmarks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 bg-surface-3 rounded-2xl flex items-center
                              justify-center mb-4 border border-surface-4">
                <svg className="w-6 h-6 text-ink-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-ink-2 mb-1">
                {debouncedSearch || activeTag || activeCollection
                  ? 'Nothing found'
                  : 'No bookmarks yet'}
              </p>
              <p className="text-xs text-ink-4 max-w-xs">
                {debouncedSearch || activeTag || activeCollection
                  ? 'Try a different search or filter'
                  : 'Use the Memex extension to save your first bookmark'}
              </p>
            </div>
          )}

          {/* Grid view */}
          {!loading && bookmarks.length > 0 && view === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bookmarks.map(b => (
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  collections={collections}
                  onDelete={handleDelete}
                  onTagClick={handleTagClick}
                  onCollectionsChange={fetchCollections}
                />
              ))}
            </div>
          )}

          {/* List view */}
          {!loading && bookmarks.length > 0 && view === 'list' && (
            <div className="flex flex-col gap-1">
              {bookmarks.map(b => (
                <ListRow
                  key={b.id}
                  bookmark={b}
                  onDelete={handleDelete}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// List row — compact view
// ─────────────────────────────────────────────
function ListRow({ bookmark, onDelete, onTagClick }: {
  bookmark:   any
  onDelete:   (id: string) => void
  onTagClick: (tag: string) => void
}) {
  let domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 3600)  return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-lg
                    hover:bg-surface-2 transition-colors border border-transparent
                    hover:border-surface-4">
      {bookmark.faviconUrl && (
        <img src={bookmark.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
             onError={e => (e.currentTarget.style.display = 'none')} />
      )}

      <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
         className="flex-1 min-w-0">
        <p className="text-xs text-ink-1 truncate hover:text-brand-bright transition-colors">
          {bookmark.title ?? domain}
        </p>
        <p className="text-[10px] text-ink-4 truncate">{domain}</p>
      </a>

      <div className="flex items-center gap-1 flex-shrink-0">
        {bookmark.tags.slice(0, 3).map((tag: any) => (
          <button
            key={tag.id}
            onClick={() => onTagClick(tag.name)}
            className="px-1.5 py-0.5 bg-brand/10 text-brand-bright text-[9px]
                       rounded hover:bg-brand/20 transition-colors"
          >
            {tag.name}
          </button>
        ))}
      </div>

      <span className="text-[10px] text-ink-4 flex-shrink-0 w-6">
        {timeAgo(bookmark.createdAt)}
      </span>

      <button
        onClick={() => onDelete(bookmark.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity
                   w-5 h-5 flex items-center justify-center rounded text-ink-4
                   hover:text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
        </svg>
      </button>
    </div>
  )
}
