import { useState } from 'react'
import { collectionsApi, readingApi } from '../lib/api'
import { useToast } from './Toast'

interface Attachment {
  id:      string
  type:    string
  content: string | null
  url:     string | null
  label:   string | null
}

interface Tag        { id: string; name: string }
interface Collection { id: string; name: string; color: string; icon: string }

interface Bookmark {
  id:            string
  url:           string
  title:         string | null
  description:   string | null
  screenshotUrl: string | null
  faviconUrl:    string | null
  ogImageUrl:    string | null
  tags:          Tag[]
  attachments:   Attachment[]
  createdAt:     string
}

interface Props {
  bookmark:            Bookmark
  collections:         Collection[]
  isSelected?:         boolean
  onToggleSelect?:     (id: string) => void
  onDelete:            (id: string) => void
  onArchive?:          (id: string) => void
  onAddToReading?:     (id: string) => void
  onTagClick:          (tag: string) => void
  onOpenModal:         (bookmark: Bookmark) => void
  onCollectionsChange: () => void
}

export function BookmarkCard({
  bookmark, collections, onDelete, onArchive, onAddToReading,
  onTagClick, onOpenModal, onCollectionsChange,
  isSelected = false, onToggleSelect,
}: Props) {
  const [showCollMenu, setShowCollMenu] = useState(false)
  const [adding,       setAdding]       = useState(false)
  const { toast } = useToast()

  const image  = bookmark.screenshotUrl ?? bookmark.ogImageUrl
  let   domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 60)    return 'just now'
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  async function addToCollection(collectionId: string) {
    setAdding(true)
    await collectionsApi.addBookmark(collectionId, bookmark.id)
    setAdding(false)
    setShowCollMenu(false)
    onCollectionsChange()
    const col = collections.find(c => c.id === collectionId)
    toast(`Added to ${col?.name ?? 'collection'}`, 'success', col?.icon ?? '📁')
  }

  // Attachment summary for the card strip
  const atts      = bookmark.attachments ?? []
  const imageAtts = atts.filter(
    a => a.type === 'screenshot' || a.type === 'area_screenshot' || a.type === 'image'
  )
  const textAtts  = atts.filter(a => a.type === 'text')
  const hasAtts   = atts.length > 0

  return (
    <div
      className={`group relative bg-surface-2 rounded-xl overflow-hidden
                  transition-all duration-200 cursor-pointer border
                  ${isSelected
                    ? 'border-brand/60 ring-2 ring-brand/20 bg-brand/5'
                    : 'border-surface-4 hover:border-surface-5'}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-checkbox]')) return
        onOpenModal(bookmark)
      }}
    >
      {/* Selection checkbox — top-left, visible on hover or when selected */}
      {onToggleSelect && (
        <div
          data-checkbox="true"
          onClick={e => { e.stopPropagation(); onToggleSelect(bookmark.id) }}
          className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2
                      flex items-center justify-center transition-all cursor-pointer
                      ${isSelected
                        ? 'bg-brand border-brand'
                        : 'bg-surface-2/80 border-surface-5 opacity-0 group-hover:opacity-100'}`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-full h-32 bg-surface-3 overflow-hidden relative">
        {image ? (
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.02]
                       transition-transform duration-300"
            onError={e => {
              const p = e.currentTarget.parentElement!
              p.innerHTML = `<div class="w-full h-full flex items-center
                justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24"
                  stroke="#333" stroke-width="1.5">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg></div>`
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-surface-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </div>
        )}

        {/* Attachment count badge */}
        {hasAtts && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full
                            bg-black/65 backdrop-blur-sm text-white text-[9px]
                            font-medium">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19
                         a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              {atts.length}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                        transition-colors duration-200" />
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs font-medium text-ink-1 leading-snug line-clamp-2
                      group-hover:text-brand-bright transition-colors mb-1">
          {bookmark.title ?? domain}
        </p>

        <div className="flex items-center gap-1.5 mb-2">
          {bookmark.faviconUrl && (
            <img
              src={bookmark.faviconUrl}
              alt=""
              className="w-3 h-3 flex-shrink-0"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
          <p className="text-[10px] text-ink-4 truncate">{domain}</p>
        </div>

        {/* Tags */}
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {bookmark.tags.slice(0, 3).map(tag => (
              <button
                key={tag.id}
                onClick={e => { e.stopPropagation(); onTagClick(tag.name) }}
                className="px-1.5 py-0.5 bg-brand/10 text-brand-bright text-[10px]
                           rounded hover:bg-brand/20 transition-colors"
              >
                {tag.name}
              </button>
            ))}
            {bookmark.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-ink-4 text-[10px]">
                +{bookmark.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Area screenshot strip — shows small crops */}
        {imageAtts.length > 0 && (
          <div className="flex gap-1 mb-2">
            {imageAtts.slice(0, 3).map(att => (
              att.url ? (
                <div
                  key={att.id}
                  className="w-10 h-8 rounded border border-surface-4
                             overflow-hidden flex-shrink-0 bg-surface-3"
                >
                  <img
                    src={att.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null
            ))}
            {imageAtts.length > 3 && (
              <div className="w-10 h-8 rounded border border-surface-4
                              bg-surface-3 flex items-center justify-center
                              text-[9px] text-ink-4 flex-shrink-0">
                +{imageAtts.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Text note preview */}
        {textAtts.length > 0 && (
          <div className="mb-2 px-2 py-1.5 bg-surface-3 border-l-2 border-brand
                          rounded-r-md">
            <p className="text-[10px] text-ink-3 line-clamp-1">
              {textAtts[0].content}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2 border-t border-surface-4"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] text-ink-4">{timeAgo(bookmark.createdAt)}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                          transition-opacity">

            {/* Add to collection */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowCollMenu(!showCollMenu) }}
                className="w-5 h-5 flex items-center justify-center rounded
                           bg-surface-3 text-ink-3 hover:text-ink-1
                           hover:bg-surface-4 transition-colors"
                title="Add to collection"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
              </button>

              {showCollMenu && (
                <div className="absolute bottom-6 right-0 w-44 bg-surface-2 border
                                border-surface-4 rounded-lg shadow-xl z-20 py-1">
                  {collections.length === 0 ? (
                    <p className="text-[10px] text-ink-4 px-3 py-2">No collections yet</p>
                  ) : (
                    collections.map(col => (
                      <button
                        key={col.id}
                        onClick={() => addToCollection(col.id)}
                        disabled={adding}
                        className="w-full flex items-center gap-2 px-3 py-1.5
                                   text-[11px] text-ink-2 hover:bg-surface-3
                                   transition-colors text-left"
                      >
                        <span>{col.icon}</span>
                        <span className="truncate">{col.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Open URL */}
            
             <a href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-5 h-5 flex items-center justify-center rounded
                         bg-surface-3 text-ink-3 hover:text-ink-1
                         hover:bg-surface-4 transition-colors"
              title="Open"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>

            {/* Add to reading list */}
            {onAddToReading && (
              <button
                onClick={async e => {
                  e.stopPropagation()
                  await readingApi.add(bookmark.id)
                  onAddToReading(bookmark.id)
                  toast('Added to reading list', 'success', '📖')
                }}
                className="w-5 h-5 flex items-center justify-center rounded
                           bg-surface-3 text-ink-3 hover:text-brand-bright
                           hover:bg-brand/10 transition-colors"
                title="Save to reading list"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            )}

            {/* Archive */}
            {onArchive && (
              <button
                onClick={e => { e.stopPropagation(); onArchive(bookmark.id) }}
                className="w-5 h-5 flex items-center justify-center rounded
                           bg-surface-3 text-ink-3 hover:text-amber-400
                           hover:bg-amber-400/10 transition-colors"
                title="Archive"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <polyline points="21 8 21 21 3 21 3 8"/>
                  <rect x="1" y="3" width="22" height="5"/>
                  <line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
              </button>
            )}

            {/* Delete */}
            <button
              onClick={e => {
                e.stopPropagation()
                onDelete(bookmark.id)
                toast('Bookmark deleted', 'error', '🗑')
              }}
              className="w-5 h-5 flex items-center justify-center rounded
                         bg-surface-3 text-ink-3 hover:text-red-400
                         hover:bg-red-400/10 transition-colors"
              title="Delete"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
