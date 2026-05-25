import { useState } from 'react'
import { collectionsApi } from '../lib/api'

interface Collection {
  id:          string
  name:        string
  description: string | null
  color:       string
  icon:        string
  count:       number
  isPublic:    boolean
  createdAt:   string
}

interface Bookmark {
  id:            string
  screenshotUrl: string | null
  ogImageUrl:    string | null
  faviconUrl:    string | null
  title:         string | null
  url:           string
}

interface Props {
  collections:           Collection[]
  onOpenCollection:      (id: string) => void
  onCollectionsChange:   () => void
}

const COLORS = ['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']
const ICONS  = ['📁','🔖','⭐','🎨','💻','📚','🚀','💡','🔬','📝','🎯','🌐','🔑','📊','🎵']

export function CollectionsPage({ collections, onOpenCollection, onCollectionsChange }: Props) {
  const [creating,     setCreating]     = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newDesc,      setNewDesc]      = useState('')
  const [newColor,     setNewColor]     = useState(COLORS[0])
  const [newIcon,      setNewIcon]      = useState('📁')
  const [saving,       setSaving]       = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    await collectionsApi.create({
      name:        newName.trim(),
      description: newDesc.trim() || undefined,
      color:       newColor,
      icon:        newIcon,
    })
    setNewName('')
    setNewDesc('')
    setCreating(false)
    setSaving(false)
    onCollectionsChange()
  }

  const filtered = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalBookmarks = collections.reduce((sum, c) => sum + c.count, 0)

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* Top bar */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span>Memex</span>
          <span className="text-ink-5">/</span>
          <span className="text-ink-1 font-medium">Collections</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4
                         rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                         focus:border-brand transition-colors"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-semibold text-ink-1">Your collections</h1>
            <p className="text-[11px] text-ink-4 mt-0.5">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
              {' · '}{totalBookmarks} bookmarks total
            </p>
          </div>

          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white
                       text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New collection
          </button>
        </div>

        {/* Create collection form */}
        {creating && (
          <div className="mb-6 p-4 bg-surface-2 border border-brand/30 rounded-2xl">
            <p className="text-xs font-medium text-ink-2 mb-3">New collection</p>

            <div className="flex gap-3 mb-3">
              {/* Icon picker */}
              <div>
                <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Icon</p>
                <div className="flex flex-wrap gap-1 w-36">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`w-7 h-7 rounded-lg text-sm transition-colors
                                  ${newIcon === icon
                                    ? 'bg-brand/20 ring-1 ring-brand/40'
                                    : 'hover:bg-surface-3'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Name</p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Collection name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') setCreating(false)
                    }}
                    className="w-full px-3 py-2 bg-surface-3 border border-surface-4
                               rounded-lg text-xs text-ink-1 outline-none focus:border-brand
                               placeholder-ink-4 transition-colors"
                  />
                </div>

                <div>
                  <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">
                    Description (optional)
                  </p>
                  <input
                    type="text"
                    placeholder="What's this collection for?"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-3 border border-surface-4
                               rounded-lg text-xs text-ink-1 outline-none focus:border-brand
                               placeholder-ink-4 transition-colors"
                  />
                </div>

                {/* Color picker */}
                <div>
                  <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Color</p>
                  <div className="flex gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        style={{ background: color }}
                        className={`w-5 h-5 rounded-full transition-transform
                                    ${newColor === color ? 'scale-125 ring-2 ring-white/20' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: newColor + '20', border: `1px solid ${newColor}30` }}
              >
                {newIcon}
              </div>
              <div>
                <p className="text-xs font-medium text-ink-1">
                  {newName || 'Collection name'}
                </p>
                <p className="text-[10px] text-ink-4">
                  {newDesc || 'No description'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex-1 py-2 bg-brand text-white text-xs font-medium
                           rounded-lg disabled:opacity-40 hover:bg-brand/90
                           transition-colors"
              >
                {saving ? 'Creating...' : 'Create collection'}
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                className="px-4 py-2 text-ink-3 text-xs hover:text-ink-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-surface-3 border border-surface-4 rounded-2xl
                            flex items-center justify-center text-3xl mb-4">
              📁
            </div>
            <p className="text-sm font-medium text-ink-2 mb-1">
              {searchQuery ? 'No collections match' : 'No collections yet'}
            </p>
            <p className="text-xs text-ink-4 mb-4">
              {searchQuery
                ? 'Try a different search'
                : 'Create a collection to organise your bookmarks'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white
                           text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors"
              >
                Create your first collection
              </button>
            )}
          </div>
        )}

        {/* Folder grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(collection => (
              <FolderCard
                key={collection.id}
                collection={collection}
                onClick={() => onOpenCollection(collection.id)}
                onDelete={async () => {
                  await collectionsApi.delete(collection.id)
                  onCollectionsChange()
                }}
                timeAgo={timeAgo}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────
// Folder Card
// ─────────────────────────────────────────────
function FolderCard({ collection, onClick, onDelete, timeAgo }: {
  collection: Collection
  onClick:    () => void
  onDelete:   () => void
  timeAgo:    (date: string) => string
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered,       setHovered]       = useState(false)

  return (
    <div
      className="group relative bg-surface-2 border border-surface-4 rounded-2xl
                 overflow-hidden cursor-pointer transition-all duration-200
                 hover:border-surface-5 hover:shadow-lg hover:shadow-black/20"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Top section — icon + info */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center
                       text-2xl flex-shrink-0 transition-transform duration-200
                       group-hover:scale-110"
            style={{
              background:   collection.color + '18',
              border:       `1px solid ${collection.color}25`,
            }}
          >
            {collection.icon}
          </div>

          {/* Delete button */}
          {hovered && !confirmDelete && (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              className="w-6 h-6 flex items-center justify-center rounded-lg
                         text-ink-4 hover:text-red-400 hover:bg-red-400/10
                         transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          )}

          {/* Confirm delete */}
          {confirmDelete && (
            <div
              className="flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={onDelete}
                className="text-[10px] text-red-400 px-2 py-1 bg-red-400/10
                           border border-red-400/20 rounded"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-ink-3 hover:text-ink-1 px-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-ink-1 mb-0.5 leading-tight">
          {collection.name}
        </p>

        {collection.description && (
          <p className="text-[10px] text-ink-4 leading-relaxed line-clamp-2">
            {collection.description}
          </p>
        )}
      </div>

      {/* Screenshot preview strip */}
      <PreviewStrip count={collection.count} color={collection.color} />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5
                      border-t border-surface-4">
        <span className="text-[10px] text-ink-4 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
          {collection.count} {collection.count === 1 ? 'bookmark' : 'bookmarks'}
        </span>

        <div className="flex items-center gap-1.5">
          {collection.isPublic && (
            <span className="text-[9px] px-1.5 py-0.5 bg-brand/10 text-brand-bright
                             rounded-full">Public</span>
          )}
          <span className="text-[10px] text-ink-5">
            {timeAgo(collection.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Preview strip — shows thumbnail placeholders
// In production these would be actual screenshots
// ─────────────────────────────────────────────
function PreviewStrip({ count, color }: { count: number; color: string }) {
  if (count === 0) {
    return (
      <div className="mx-3 mb-3 h-14 bg-surface-3 border border-surface-4
                      rounded-xl flex items-center justify-center">
        <p className="text-[10px] text-ink-5">Empty collection</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 mx-3 mb-3 rounded-xl overflow-hidden h-14">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="flex items-center justify-center"
          style={{ background: color + (i === 0 ? '20' : i === 1 ? '14' : '0a') }}
        >
          {i < count ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke={color + '60'} strokeWidth={1.5}>
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          ) : (
            <div className="w-4 h-4 border border-dashed rounded"
                 style={{ borderColor: color + '20' }} />
          )}
        </div>
      ))}
    </div>
  )
}
