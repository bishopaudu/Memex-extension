import { useState, useEffect } from 'react'
import { collectionsApi } from '../lib/api'
import { BookmarkCard }        from '../components/BookmarkCard'
import { BookmarkDetailPage }  from './BookmarkDetailPage'
import { BookmarkModalLoader } from '../components/BookmarkModalLoader'

interface Props {
  collectionId:        string
  allCollections:      any[]
  onBack:              () => void
  onTagClick:          (tag: string) => void
  onCollectionsChange: () => void
}

export function CollectionDetailPage({
  collectionId, allCollections, onBack, onTagClick, onCollectionsChange
}: Props) {
  const [collection, setCollection] = useState<any | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailId,   setDetailId]   = useState<string | null>(null)
  const [view,       setView]       = useState<'grid' | 'list'>('grid')
  const [sharing,    setSharing]    = useState(false)
  const [shareUrl,   setShareUrl]   = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  useEffect(() => {
    fetchCollection()
  }, [collectionId])

  async function fetchCollection() {
    setLoading(true)
    const result = await collectionsApi.getOne(collectionId)
    if (!result.error) setCollection(result.data.collection)
    setLoading(false)
  }

  async function handleTogglePublic() {
    if (!collection) return
    setSharing(true)
    const r = await collectionsApi.update(collection.id, { isPublic: !collection.isPublic })
    if (!r.error) {
      const newIsPublic = !collection.isPublic
      setCollection((prev: any) => prev ? { ...prev, isPublic: newIsPublic } : prev)
      if (newIsPublic) {
        const meRes = await fetch('http://localhost:3001/api/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('memex_token') ?? ''}` }
        })
        const meData = await meRes.json().catch(() => null)
        const username = meData?.data?.user?.username ?? 'user'
        // Get slug from updated collection
        const updated = await collectionsApi.getOne(collection.id)
        if (!updated.error) {
          const slug = updated.data.collection.slug
          setCollection((prev: any) => prev ? { ...prev, slug } : prev)
          setShareUrl(`${window.location.origin}/p/${username}/collection/${slug}`)
        }
      } else {
        setShareUrl(null)
      }
    }
    setSharing(false)
  }

  async function handleDelete(bookmarkId: string) {
    // Remove bookmark from local state optimistically
    setCollection((prev: any) => ({
      ...prev,
      bookmarks: prev.bookmarks.filter((b: any) => b.id !== bookmarkId),
    }))
  }

  if (detailId) {
    return (
      <BookmarkDetailPage
        bookmarkId={detailId}
        onBack={() => setDetailId(null)}
        onDelete={id => { handleDelete(id); setDetailId(null) }}
        onTagClick={tag => { onTagClick(tag); onBack() }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <p className="text-sm text-ink-2 mb-2">Collection not found</p>
          <button onClick={onBack} className="text-xs text-brand-bright hover:underline">
            ← Back to collections
          </button>
        </div>
      </div>
    )
  }

  const bookmarks = collection.bookmarks ?? []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* Top bar */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <button
            onClick={onBack}
            className="hover:text-ink-1 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Collections
          </button>
          <span className="text-ink-5">/</span>
          <span className="text-ink-1 font-medium flex items-center gap-1">
            <span>{collection.icon}</span>
            {collection.name}
          </span>
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors
                        ${view === 'grid' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors
                        ${view === 'list' ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">

        {/* Collection hero */}
        <div className="border-b border-surface-4 px-5 py-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center
                         text-3xl border flex-shrink-0"
              style={{
                background:   collection.color + '15',
                borderColor:  collection.color + '30',
              }}
            >
              {collection.icon}
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink-1 mb-0.5">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-xs text-ink-3 mb-1">{collection.description}</p>
              )}
              <p className="text-[11px] text-ink-4">
                {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Empty state */}
          {bookmarks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-surface-3 border border-surface-4 rounded-2xl
                              flex items-center justify-center text-2xl mb-4">
                {collection.icon}
              </div>
              <p className="text-sm font-medium text-ink-2 mb-1">
                This collection is empty
              </p>
              <p className="text-xs text-ink-4 max-w-xs">
                Add bookmarks to this collection from any bookmark card using the
                folder icon
              </p>
            </div>
          )}

          {/* Grid */}
          {bookmarks.length > 0 && view === 'grid' && (
            <div className="columns-1 sm:columns-2 lg:grid-cols-3
                            xl:columns-4 gap-3">
              {bookmarks.map((b: any) => (
                <div key={b.id} className="break-inside-avoid mb-3">
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  collections={allCollections}
                  onDelete={handleDelete}
                  onTagClick={tag => { onTagClick(tag); onBack() }}
                  onOpenModal={b => setDetailId(b.id)}
                  onCollectionsChange={onCollectionsChange}
                />
                </div>
              ))}
            </div>
          )}

          {/* List */}
          {bookmarks.length > 0 && view === 'list' && (
            <div className="flex flex-col gap-1">
              {bookmarks.map((b: any) => (
                <CollectionListRow
                  key={b.id}
                  bookmark={b}
                  onDelete={handleDelete}
                  onOpenModal={b => setDetailId(b.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedId && (
        <BookmarkModalLoader
          bookmarkId={selectedId}
          onClose={() => setSelectedId(null)}
          onDelete={id => { handleDelete(id); setSelectedId(null) }}
          onTagClick={tag => { onTagClick(tag); onBack(); setSelectedId(null) }}
        />
      )}
    </div>
  )
}

function CollectionListRow({ bookmark, onDelete, onOpenModal }: {
  bookmark:    any
  onDelete:    (id: string) => void
  onOpenModal: (b: any) => void
}) {
  let domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

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
      <div className="flex items-center gap-1">
        {(bookmark.tags ?? []).slice(0, 2).map((tag: any) => (
          <span key={tag.id}
                className="px-1.5 py-0.5 bg-brand/10 text-brand-bright
                           text-[9px] rounded">
            {tag.name}
          </span>
        ))}
      </div>
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
