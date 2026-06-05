import { useState } from 'react'
import { collectionsApi, digestApi } from '../lib/api'

interface Tag        { id: string; name: string; count: number }
interface Collection { id: string; name: string; color: string; icon: string; count: number }

interface Props {
  tags:          Tag[]
  collections:   Collection[]
  activeTag:     string
  activeCollection: string
  bookmarkCount: number
  currentPage:   'home' | 'collections' | 'wiki' | 'archive' | 'reading' 
  onTagClick:       (tag: string) => void
  onCollectionClick: (id: string) => void
  onCollectionsChange: () => void
  onOpenCollectionsPage: () => void
  onOpenWikiPage:   () => void
  onOpenArchive:    () => void
  onOpenReadingList: () => void
  onGoHome:         () => void
  userEmail: string
  onLogout: () => void
}

const COLORS = ['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']

export function Sidebar({
  tags, collections, activeTag, activeCollection,
  bookmarkCount, currentPage, onTagClick, onCollectionClick,
  onCollectionsChange, onOpenCollectionsPage, onOpenWikiPage, onOpenArchive, onOpenReadingList, onGoHome,
  userEmail, onLogout
}: Props) {
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState(COLORS[0])
  const [newIcon,    setNewIcon]    = useState('📁')
  const [saving,     setSaving]     = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)
  const [digestSent,    setDigestSent]    = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    await collectionsApi.create({ name: newName.trim(), color: newColor, icon: newIcon })
    setNewName('')
    setCreating(false)
    setSaving(false)
    onCollectionsChange()
  }

  const initial = userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface-2 border-r border-surface-4
                      flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-surface-4">
        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center
                        text-white font-bold text-xs flex-shrink-0">M</div>
        <span className="text-sm font-semibold text-ink-1">Memex</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">

        {/* Main nav */}
        <div className="mb-4">
          <button
            onClick={() => { onTagClick(''); onCollectionClick(''); onGoHome() }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${!activeTag && !activeCollection
                          ? 'bg-brand/10 text-brand-bright'
                          : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            All bookmarks
            <span className="ml-auto text-[10px] bg-surface-3 text-ink-4 px-1.5 py-0.5 rounded">
              {bookmarkCount}
            </span>
          </button>

          <button
            onClick={onOpenCollectionsPage}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'collections'
                          ? 'bg-brand/10 text-brand-bright'
                          : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            Collections
            <span className="ml-auto text-[10px] bg-surface-3 text-ink-4 px-1.5 py-0.5 rounded">
              {collections.length}
            </span>
          </button>

          <button
            onClick={onOpenWikiPage}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'wiki'
                          ? 'bg-brand/10 text-brand-bright'
                          : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
          >
            <span className="text-sm leading-none">🧠</span>
            Wiki
          </button>

          <button
            onClick={onOpenArchive}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'archive'
                          ? 'bg-brand/10 text-brand-bright'
                          : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
          >
            <span className="text-sm leading-none">📦</span>
            Archive
          </button>

          <button
            onClick={onOpenReadingList}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                        transition-colors text-left
                        ${currentPage === 'reading'
                          ? 'bg-brand/10 text-brand-bright'
                          : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
          >
            <span className="text-sm leading-none">📖</span>
            Reading list
          </button>
        </div>

        {/* Collections */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-medium text-ink-4 uppercase tracking-widest">
              Collections
            </span>
            <button
              onClick={() => setCreating(true)}
              className="w-4 h-4 flex items-center justify-center text-ink-4
                         hover:text-ink-2 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {collections.map(col => (
            <button
              key={col.id}
              onClick={() => onCollectionClick(col.id === activeCollection ? '' : col.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                          transition-colors text-left group
                          ${activeCollection === col.id
                            ? 'bg-brand/10 text-brand-bright'
                            : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
            >
              <span className="text-sm">{col.icon}</span>
              <span className="truncate flex-1">{col.name}</span>
              <span className="text-[10px] text-ink-4 ml-auto">{col.count}</span>
            </button>
          ))}

          {/* Create collection inline form */}
          {creating && (
            <div className="mt-2 p-2 bg-surface-3 rounded-lg border border-surface-4">
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
                className="w-full bg-surface-2 border border-surface-4 rounded px-2 py-1
                           text-xs text-ink-1 outline-none focus:border-brand
                           placeholder-ink-4 mb-2"
              />

              {/* Emoji picker — simple */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {['📁','🔖','⭐','🎨','💻','📚','🚀','💡','🔬','📝'].map(e => (
                  <button
                    key={e}
                    onClick={() => setNewIcon(e)}
                    className={`w-6 h-6 text-xs rounded transition-colors
                                ${newIcon === e ? 'bg-brand/20' : 'hover:bg-surface-4'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <div className="flex gap-1 mb-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{ background: c }}
                    className={`w-4 h-4 rounded-full transition-transform
                                ${newColor === c ? 'scale-125' : ''}`}
                  />
                ))}
              </div>

              <div className="flex gap-1">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="flex-1 py-1 bg-brand text-white text-xs rounded
                             disabled:opacity-40 hover:bg-brand/90 transition-colors"
                >
                  {saving ? '...' : 'Create'}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-2 py-1 text-ink-3 text-xs hover:text-ink-1 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {collections.length === 0 && !creating && (
            <p className="text-[10px] text-ink-4 px-2 py-1">
              No collections yet
            </p>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <div className="px-2 mb-1">
              <span className="text-[10px] font-medium text-ink-4 uppercase tracking-widest">
                Tags
              </span>
            </div>
            {tags.slice(0, 10).map(tag => (
              <button
                key={tag.id}
                onClick={() => { onTagClick(tag.name === activeTag ? '' : tag.name); onGoHome() }}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs
                            transition-colors text-left
                            ${activeTag === tag.name
                              ? 'bg-brand/10 text-brand-bright'
                              : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
              >
                <span className="text-brand-bright opacity-60">#</span>
                <span className="truncate flex-1">{tag.name}</span>
                <span className="text-[10px] text-ink-4">{tag.count}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-surface-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center
                        text-[10px] font-medium text-brand-bright flex-shrink-0">
          {initial}
        </div>
        <span className="text-[11px] text-ink-3 truncate flex-1">{userEmail}</span>
        <button
          onClick={async () => {
            setSendingDigest(true)
            await digestApi.sendDigest()
            setSendingDigest(false)
            setDigestSent(true)
            setTimeout(() => setDigestSent(false), 3000)
          }}
          disabled={sendingDigest}
          className="text-[10px] text-ink-4 hover:text-ink-2 transition-colors
                     flex-shrink-0 mr-1"
          title="Send weekly digest email"
        >
          {digestSent ? '✓' : sendingDigest ? '...' : '📧'}
        </button>

        <button
          onClick={onLogout}
          className="text-[10px] text-ink-4 hover:text-ink-2 transition-colors flex-shrink-0"
          title="Sign out"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}
