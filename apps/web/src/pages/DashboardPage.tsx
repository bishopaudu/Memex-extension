import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { bookmarksApi, tagsApi, collectionsApi } from '../lib/api'
import { BookmarkCard }           from '../components/BookmarkCard'
import { BookmarkModalLoader }    from '../components/BookmarkModalLoader'
import { BookmarkDetailPage }     from './BookmarkDetailPage'
import { Sidebar }                from '../components/Sidebar'
import { CollectionsPage }        from './CollectionsPage'
import { SearchModal }             from '../components/SearchModal'
import { CollectionDetailPage }   from './CollectionDetailPage'
import { WikiPage }                from './WikiPage'
import { ArchivePage }             from './ArchivePage'
import { BulkActionBar }           from '../components/BulkActionBar'
import { GettingStarted }          from '../components/GettingStarted'
import { ProfileModal }            from '../components/ProfileModal'
import { ReadingListPage }         from './ReadingListPage'
import { TopicPage }               from './TopicPage'

interface Props {}

type Page =
  | { type: 'home' }
  | { type: 'collections' }
  | { type: 'collection-detail'; collectionId: string }
  | { type: 'wiki' }
  | { type: 'topic'; topicId: string }
  | { type: 'archive' }
  | { type: 'reading' }
  | { type: 'bookmark-detail'; bookmarkId: string }

export function DashboardPage(_props: Props) {
  const { auth, logout } = useAuth()

  const [page,             setPage]             = useState<Page>({ type: 'home' })
  const [bookmarks,        setBookmarks]        = useState<any[]>([])
  const [tags,             setTags]             = useState<any[]>([])
  const [collections,      setCollections]      = useState<any[]>([])
  const [search,           setSearch]           = useState('')
  const [activeTag,        setActiveTag]        = useState('')
  const [activeCollection, setActiveCollection] = useState('')
  const [loading,          setLoading]          = useState(true)
  const [view,             setView]             = useState<'grid' | 'list'>('grid')
  const [topics,           setTopics]           = useState<any[]>([])
  const [selectedId,       setSelectedId]       = useState<string | null>(null)
  const [showSearch,       setShowSearch]       = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<string[]>([])
  const [showProfile,      setShowProfile]      = useState(false)
  const [avatarUrl,        setAvatarUrl]        = useState('')
  const [debouncedSearch,  setDebouncedSearch]  = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (page.type === 'home') fetchBookmarks()
    // Clear selection when navigating away
    setSelectedIds([])
  }, [debouncedSearch, activeTag, activeCollection, page])

  useEffect(() => {
    fetchTags()
    fetchCollections()
    fetchTopics()
    // Load avatar from auth user
    if (auth.status === 'authenticated' && auth.user?.avatarUrl) {
      setAvatarUrl(auth.user.avatarUrl)
    }
  }, [])

  // Global Cmd+K to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
    const r = await tagsApi.list()
    if (!r.error) setTags(r.data.items)
  }

  async function fetchTopics() {
    const { topicsApi } = await import('../lib/api')
    const r = await topicsApi.list()
    if (!r.error) setTopics(r.data.items)
  }

  async function fetchCollections() {
    const r = await collectionsApi.list()
    if (!r.error) setCollections(r.data.items)
  }

  async function handleDelete(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    const r = await bookmarksApi.delete(id)
    if (r.error) fetchBookmarks()
    else { fetchTags(); fetchCollections() }
  }

  async function handleArchive(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    await bookmarksApi.archive(id)
    fetchTags()
  }
  // ── Bulk action handlers ──
  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleBulkDelete(ids: string[]) {
    setBookmarks(prev => prev.filter(b => !ids.includes(b.id)))
    await Promise.all(ids.map(id => bookmarksApi.delete(id)))
    setSelectedIds([])
    fetchTags()
    fetchCollections()
  }

  async function handleBulkArchive(ids: string[]) {
    setBookmarks(prev => prev.filter(b => !ids.includes(b.id)))
    await Promise.all(ids.map(id => bookmarksApi.archive(id)))
    setSelectedIds([])
  }

  async function handleBulkAddToCollection(ids: string[], collectionId: string) {
    await Promise.all(ids.map(id => collectionsApi.addBookmark(collectionId, id)))
    setSelectedIds([])
    fetchCollections()
  }

  async function handleBulkTag(ids: string[], tag: string) {
    await Promise.all(ids.map(id =>
      bookmarksApi.update(id, { tags: [tag] })
    ))
    setSelectedIds([])
    fetchTags()
  }

  function handleTagClick(tag: string) {
    setActiveTag(prev => prev === tag ? '' : tag)
    setActiveCollection('')
    setSearch('')
    setPage({ type: 'home' })
  }

  function handleCollectionClick(id: string) {
    setPage({ type: 'collection-detail', collectionId: id })
  }

  const user = auth.status === 'authenticated' ? auth.user : null

  // Sidebar current page indicator
  const sidebarPage: 'home' | 'collections' | 'wiki' | 'archive' | 'reading' =
    page.type === 'collections' || page.type === 'collection-detail'
      ? 'collections'
    : page.type === 'wiki'    || page.type === 'topic'
      ? 'wiki'
    : page.type === 'archive'
      ? 'archive'
    : page.type === 'reading'
      ? 'reading'
    : 'home'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        tags={tags}
        collections={collections}
        activeTag={activeTag}
        activeCollection={activeCollection}
        bookmarkCount={bookmarks.length}
        currentPage={sidebarPage}
        onTagClick={handleTagClick}
        onCollectionClick={handleCollectionClick}
        onCollectionsChange={fetchCollections}
        onOpenCollectionsPage={() => setPage({ type: 'collections' })}
        onOpenWikiPage={() => setPage({ type: 'wiki' })}
        onOpenArchive={() => setPage({ type: 'archive' })}
        onOpenReadingList={() => setPage({ type: 'reading' })}
        onOpenProfile={() => setShowProfile(true)}
        avatarUrl={avatarUrl}
        onGoHome={() => {
          setPage({ type: 'home' })
          setActiveCollection('')
          setActiveTag('')
          setSearch('')
        }}
        userEmail={user?.email ?? ''}
        onLogout={logout}
      />

      {/* ── COLLECTIONS PAGE ── */}
      {page.type === 'collections' && (
        <CollectionsPage
          collections={collections}
          onOpenCollection={id => setPage({ type: 'collection-detail', collectionId: id })}
          onCollectionsChange={fetchCollections}
        />
      )}

      {/* ── WIKI PAGE ── */}
      {page.type === 'wiki' && (
        <WikiPage
          topics={topics}
          onOpenTopic={id => setPage({ type: 'topic', topicId: id })}
          onTopicsChange={fetchTopics}
        />
      )}

      {/* ── TOPIC DETAIL ── */}
      {page.type === 'topic' && (
        <TopicPage
          topicId={page.topicId}
          allTopics={topics}
          onBack={() => setPage({ type: 'wiki' })}
          onDelete={async (id) => {
            const { topicsApi } = await import('../lib/api')
            await topicsApi.delete(id)
            fetchTopics()
            setPage({ type: 'wiki' })
          }}
        />
      )}

      {/* ── COLLECTION DETAIL ── */}
      {page.type === 'collection-detail' && (
        <CollectionDetailPage
          collectionId={page.collectionId}
          allCollections={collections}
          onBack={() => setPage({ type: 'collections' })}
          onTagClick={handleTagClick}
          onCollectionsChange={fetchCollections}
        />
      )}

      {/* ── ARCHIVE PAGE ── */}
      {page.type === 'archive' && (
        <ArchivePage
          onOpenBookmark={id => setPage({ type: 'bookmark-detail', bookmarkId: id })}
        />
      )}

      {/* ── READING LIST PAGE ── */}
      {page.type === 'reading' && (
        <ReadingListPage
          onOpenBookmark={id => setPage({ type: 'bookmark-detail', bookmarkId: id })}
        />
      )}

      {/* ── HOME PAGE ── */}
      {page.type === 'home' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">
          <header className="h-12 border-b border-surface-4 flex items-center
                             gap-3 px-5 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-ink-3 flex-shrink-0">
              <span>Memex</span>
              {activeTag && (
                <>
                  <span className="text-ink-5">/</span>
                  <span className="text-brand-bright">#{activeTag}</span>
                </>
              )}
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5">
                {(['grid', 'list'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                          className={`w-6 h-6 rounded flex items-center justify-center
                                      transition-colors
                                      ${view === v ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`}>
                    {v === 'grid' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={2}>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="3" y1="18" x2="21" y2="18"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-5">
            {activeTag && (
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center gap-1 px-2 py-1 bg-brand/10
                                 text-brand-bright text-xs rounded-full border border-brand/20">
                  #{activeTag}
                  <button onClick={() => setActiveTag('')} className="hover:text-white ml-0.5">×</button>
                </span>
              </div>
            )}

            {/* Getting started — shown to new users */}
            {!activeTag && !activeCollection && !debouncedSearch && (
              <GettingStarted
                bookmarkCount={bookmarks.length}
                topicCount={topics.length}
                collectionCount={collections.length}
                hasExtension={false}
                onOpenWiki={() => setPage({ type: 'wiki' })}
                onOpenCollections={() => setPage({ type: 'collections' })}
              />
            )}

            {!loading && (
              <p className="text-[11px] text-ink-4 mb-4">
                {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent
                                rounded-full animate-spin" />
              </div>
            )}

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
                  {debouncedSearch || activeTag ? 'Nothing found' : 'No bookmarks yet'}
                </p>
                <p className="text-xs text-ink-4 max-w-xs">
                  {debouncedSearch || activeTag
                    ? 'Try a different search or filter'
                    : 'Use the Memex extension to save your first bookmark'}
                </p>
              </div>
            )}

            {!loading && bookmarks.length > 0 && view === 'grid' && (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3
                              space-y-3">
                {bookmarks.map(b => (
                  <div key={b.id} className="break-inside-avoid mb-3">
                  <BookmarkCard
                    key={b.id}
                    bookmark={b}
                    collections={collections}
                    isSelected={selectedIds.includes(b.id)}
                    onToggleSelect={toggleSelect}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onAddToReading={() => {}}
                    onTagClick={handleTagClick}
                    onOpenModal={b => setPage({ type: 'bookmark-detail', bookmarkId: b.id })}
                    onCollectionsChange={() => { fetchCollections(); fetchBookmarks() }}
                  />
                  </div>
                ))}
              </div>
            )}

            {!loading && bookmarks.length > 0 && view === 'list' && (
              <div className="flex flex-col gap-1">
                {bookmarks.map(b => (
                  <ListRow
                    key={b.id}
                    bookmark={b}
                    onDelete={handleDelete}
                    onTagClick={handleTagClick}
                    onOpenModal={b => setPage({ type: 'bookmark-detail', bookmarkId: b.id })}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && auth.status === 'authenticated' && (
        <ProfileModal
          user={{ ...auth.user, avatarUrl }}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            if (updatedUser.avatarUrl) setAvatarUrl(updatedUser.avatarUrl)
            setShowProfile(false)
          }}
        />
      )}

      <BulkActionBar
        selectedIds={selectedIds}
        collections={collections}
        onClear={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        onArchive={handleBulkArchive}
        onAddToCollection={handleBulkAddToCollection}
        onAddTag={handleBulkTag}
      />


      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onOpenBookmark={id => { setSelectedId(id); setShowSearch(false) }}
          onOpenTopic={id => { setPage({ type: 'topic', topicId: id }); setShowSearch(false) }}
        />
      )}

      {/* ── BOOKMARK DETAIL PAGE ── */}
      {page.type === 'bookmark-detail' && (
        <BookmarkDetailPage
          bookmarkId={page.bookmarkId}
          onBack={() => setPage({ type: 'home' })}
          onDelete={id => { handleDelete(id); setPage({ type: 'home' }) }}
          onTagClick={handleTagClick}
        />
      )}

      {selectedId && (
        <BookmarkModalLoader
          bookmarkId={selectedId}
          onClose={() => setSelectedId(null)}
          onDelete={id => { handleDelete(id); setSelectedId(null) }}
          onTagClick={tag => { handleTagClick(tag); setSelectedId(null) }}
        />
      )}
    </div>
  )
}

function ListRow({ bookmark, onDelete, onTagClick, onOpenModal }: {
  bookmark:    any
  onDelete:    (id: string) => void
  onTagClick:  (tag: string) => void
  onOpenModal: (bookmark: any) => void
}) {
  let domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 3600)  return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  const atts = bookmark.attachments ?? []

  return (
    <div
      onClick={() => onOpenModal(bookmark)}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                 hover:bg-surface-2 transition-colors border border-transparent
                 hover:border-surface-4"
    >
      {bookmark.faviconUrl && (
        <img src={bookmark.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
             onError={e => (e.currentTarget.style.display = 'none')} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-1 truncate">{bookmark.title ?? domain}</p>
        <p className="text-[10px] text-ink-4 truncate">{domain}</p>
      </div>
      {atts.length > 0 && (
        <div className="flex items-center gap-1 text-[10px]">
          {atts.some((a: any) => a.type === 'screenshot' || a.type === 'area_screenshot') && '📸'}
          {atts.some((a: any) => a.type === 'text') && '📝'}
        </div>
      )}
      <div className="flex items-center gap-1">
        {bookmark.tags.slice(0, 2).map((tag: any) => (
          <button key={tag.id}
                  onClick={e => { e.stopPropagation(); onTagClick(tag.name) }}
                  className="px-1.5 py-0.5 bg-brand/10 text-brand-bright
                             text-[9px] rounded hover:bg-brand/20 transition-colors">
            {tag.name}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-ink-4 w-6">{timeAgo(bookmark.createdAt)}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(bookmark.id) }}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center
                   justify-center rounded text-ink-4 hover:text-red-400
                   hover:bg-red-400/10 transition-all"
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
