import { useState, useEffect, useRef, useCallback } from 'react'
import { topicsApi, bookmarksApi } from '../lib/api'

interface Block {
  id:       string
  type:     'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'code' | 'quote' | 'divider' | 'bookmark_embed'
  content:  string
  metadata?: string
  order:    string
}

interface Reference {
  bookmarkId: string
  note:       string | null
  bookmark: {
    id:            string
    url:           string
    title:         string | null
    faviconUrl:    string | null
    screenshotUrl: string | null
    description:   string | null
    tags:          { id: string; name: string }[]
  }
}

interface Connection {
  topicId: string
  title:   string
  emoji:   string
  label:   string | null
}

interface Topic {
  id:          string
  title:       string
  emoji:       string
  summary:     string | null
  coverColor:  string
  isPublic:    boolean
  blocks:      Block[]
  references:  Reference[]
  connections: Connection[]
  backlinks:   Connection[]
  updatedAt:   string
}

interface Props {
  topicId:    string
  allTopics:  any[]
  onBack:     () => void
  onDelete:   (id: string) => void
}

const BLOCK_TYPES = [
  { type: 'heading1',       icon: 'H1', label: 'Heading 1' },
  { type: 'heading2',       icon: 'H2', label: 'Heading 2' },
  { type: 'heading3',       icon: 'H3', label: 'Heading 3' },
  { type: 'paragraph',      icon: '¶',  label: 'Paragraph' },
  { type: 'bullet',         icon: '•',  label: 'Bullet' },
  { type: 'code',           icon: '<>', label: 'Code' },
  { type: 'quote',          icon: '"',  label: 'Quote' },
  { type: 'divider',        icon: '—',  label: 'Divider' },
  { type: 'bookmark_embed', icon: '🔗', label: 'Bookmark embed' },
]

export function TopicPage({ topicId, allTopics, onBack, onDelete }: Props) {
  const [topic,        setTopic]        = useState<Topic | null>(null)
  const [blocks,       setBlocks]       = useState<Block[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal,     setTitleVal]     = useState('')
  const [showAddRef,   setShowAddRef]   = useState(false)
  const [showConnect,  setShowConnect]  = useState(false)
  const [allBookmarks, setAllBookmarks] = useState<any[]>([])
  const [blockMenu,    setBlockMenu]    = useState<string | null>(null)
  const [activeBlock,  setActiveBlock]  = useState<string | null>(null)
  const saveTimer = useRef<any>(null)

  useEffect(() => {
    fetchTopic()
    fetchBookmarks()
  }, [topicId])

  async function fetchTopic() {
    setLoading(true)
    const r = await topicsApi.getOne(topicId)
    if (!r.error) {
      setTopic(r.data.topic)
      setBlocks(r.data.topic.blocks)
      setTitleVal(r.data.topic.title)
    }
    setLoading(false)
  }

  async function fetchBookmarks() {
    const r = await bookmarksApi.list()
    if (!r.error) setAllBookmarks(r.data.items)
  }


  // Auto-save blocks 1.5s after last change
  const scheduleAutoSave = useCallback((newBlocks: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await topicsApi.saveBlocks(topicId, newBlocks)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1500)
  }, [topicId])

  function updateBlock(id: string, content: string) {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b)
    setBlocks(newBlocks)
    scheduleAutoSave(newBlocks)
  }

  function addBlock(afterId: string, type: Block['type'] = 'paragraph') {
    const newBlock: Block = {
      id:      crypto.randomUUID(),
      type,
      content: '',
      order:   Date.now().toString(),
    }
    const idx = blocks.findIndex(b => b.id === afterId)
    const newBlocks = [
      ...blocks.slice(0, idx + 1),
      newBlock,
      ...blocks.slice(idx + 1),
    ]
    setBlocks(newBlocks)
    setBlockMenu(null)
    scheduleAutoSave(newBlocks)
    // Focus new block
    setTimeout(() => {
      document.getElementById(`block-${newBlock.id}`)?.focus()
    }, 50)
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return
    const newBlocks = blocks.filter(b => b.id !== id)
    setBlocks(newBlocks)
    scheduleAutoSave(newBlocks)
  }

  function changeBlockType(id: string, type: Block['type']) {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, type } : b)
    setBlocks(newBlocks)
    setBlockMenu(null)
    scheduleAutoSave(newBlocks)
  }

  async function saveTitle() {
    if (!topic || !titleVal.trim()) return
    setEditingTitle(false)
    await topicsApi.update(topicId, { title: titleVal })
    setTopic(prev => prev ? { ...prev, title: titleVal } : prev)
  }

  async function addReference(bookmarkId: string) {
    await topicsApi.addReference(topicId, bookmarkId)
    setShowAddRef(false)
    fetchTopic()
  }

  async function removeReference(bookmarkId: string) {
    await topicsApi.removeReference(topicId, bookmarkId)
    fetchTopic()
  }

  async function connectTopic(toId: string) {
    await topicsApi.connect(topicId, toId)
    // Don't close panel — user can keep adding connections
    fetchTopic()
  }

  async function disconnectTopic(toId: string) {
    await topicsApi.disconnect(topicId, toId)
    fetchTopic()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <p className="text-sm text-ink-2 mb-2">Topic not found</p>
          <button onClick={onBack} className="text-xs text-brand-bright hover:underline">
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // Topics not already connected, excluding self
  const connectableTopics = allTopics.filter(t =>
    t.id !== topicId &&
    !topic.connections.some(c => c.topicId === t.id) &&
    !topic.backlinks.some(b => b.topicId === t.id)
  )

  // Bookmarks not already referenced
  const unreferencedBookmarks = allBookmarks.filter(b =>
    !topic.references.some(r => r.bookmarkId === b.id)
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* ── TOP BAR ── */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <button onClick={onBack}
                  className="hover:text-ink-1 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Wiki
          </button>
          <span className="text-ink-5">/</span>
          <span className="text-ink-1 font-medium">
            {topic.emoji} {topic.title}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {saving && (
            <span className="text-[10px] text-ink-4 flex items-center gap-1">
              <div className="w-2.5 h-2.5 border border-ink-4 border-t-transparent
                              rounded-full animate-spin" />
              Saving...
            </span>
          )}
          {saved && !saving && (
            <span className="text-[10px] text-green-400">✓ Saved</span>
          )}
          <button
            onClick={() => onDelete(topic.id)}
            className="text-[10px] text-ink-4 hover:text-red-400 px-2 py-1
                       hover:bg-red-400/10 rounded transition-colors"
          >
            Delete topic
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT — two column layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: EDITOR ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">

            {/* Cover color bar */}
            <div
              className="w-full h-1.5 rounded-full mb-8 opacity-60"
              style={{ background: topic.coverColor }}
            />

            {/* Emoji + Title */}
            <div className="flex items-start gap-3 mb-8">
              <button
                className="text-4xl hover:opacity-80 transition-opacity mt-1"
                title="Change emoji"
                onClick={() => {/* emoji picker TODO */}}
              >
                {topic.emoji}
              </button>

              {editingTitle ? (
                <input
                  autoFocus
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
                  className="flex-1 text-3xl font-bold text-ink-1 bg-transparent
                             outline-none border-b border-brand/40 pb-1"
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="flex-1 text-3xl font-bold text-ink-1 cursor-text
                             hover:opacity-80 transition-opacity leading-tight"
                >
                  {topic.title}
                </h1>
              )}
            </div>

            {/* Summary */}
            <SummaryInput
              value={topic.summary ?? ''}
              onChange={async (v) => {
                setTopic(prev => prev ? { ...prev, summary: v } : prev)
                await topicsApi.update(topicId, { summary: v })
              }}
            />

            {/* ── BLOCK EDITOR ── */}
            <div className="mt-6 flex flex-col gap-0.5">
              {blocks.map((block, idx) => (
                block.type === 'bookmark_embed' ? (
                  <BookmarkEmbedBlock
                    key={block.id}
                    block={block}
                    allBookmarks={allBookmarks}
                    onSelect={(bookmarkId) => updateBlock(block.id, bookmarkId)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ) : (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    isActive={activeBlock === block.id}
                    showMenu={blockMenu === block.id}
                    onFocus={() => setActiveBlock(block.id)}
                    onBlur={() => setActiveBlock(null)}
                    onUpdate={content => updateBlock(block.id, content)}
                    onEnter={() => addBlock(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    onMenuToggle={() => setBlockMenu(prev => prev === block.id ? null : block.id)}
                    onChangeType={type => changeBlockType(block.id, type as Block['type'])}
                    onAddBelow={type => addBlock(block.id, type as Block['type'])}
                  />
                )
              ))}

              {/* Add block button */}
              <button
                onClick={() => addBlock(blocks[blocks.length - 1]?.id ?? '', 'paragraph')}
                className="flex items-center gap-2 mt-4 text-xs text-ink-5
                           hover:text-ink-3 transition-colors group"
              >
                <span className="w-5 h-5 rounded border border-dashed border-surface-5
                                 group-hover:border-surface-6 flex items-center justify-center
                                 text-[10px]">+</span>
                Add block
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: SIDEBAR PANEL ── */}
        <div className="w-72 flex-shrink-0 border-l border-surface-4 overflow-y-auto
                        bg-surface-2 p-4 flex flex-col gap-5">

          {/* References */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-ink-4 uppercase tracking-wider">
                References ({topic.references.length})
              </p>
              <button
                onClick={() => setShowAddRef(!showAddRef)}
                className="text-[10px] text-brand-bright hover:underline"
              >
                + Add
              </button>
            </div>

            {/* Add reference search */}
            {showAddRef && (
              <ReferenceSearch
                bookmarks={unreferencedBookmarks}
                onAdd={addReference}
                onClose={() => setShowAddRef(false)}
              />
            )}

            {/* Reference list */}
            <div className="flex flex-col gap-1.5">
              {topic.references.length === 0 && !showAddRef && (
                <p className="text-[10px] text-ink-5 py-2 text-center border border-dashed
                               border-surface-5 rounded-lg">
                  No references yet
                </p>
              )}
              {topic.references.map(ref => (
                <ReferenceCard
                  key={ref.bookmarkId}
                  reference={ref}
                  onRemove={() => removeReference(ref.bookmarkId)}
                />
              ))}
            </div>
          </div>

          {/* Connections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-ink-4 uppercase tracking-wider">
                Connected topics ({topic.connections.length + topic.backlinks.length})
              </p>
              <button
                onClick={() => setShowConnect(!showConnect)}
                className={`text-[10px] transition-colors
                            ${showConnect
                              ? 'text-ink-3 hover:text-ink-1'
                              : 'text-brand-bright hover:underline'}`}
              >
                {showConnect ? 'Done' : '+ Link'}
              </button>
            </div>

            {showConnect && (
              <div className="mb-2 bg-surface-3 border border-surface-4 rounded-lg
                              overflow-hidden max-h-36 overflow-y-auto">
                {connectableTopics.length === 0 ? (
                  <p className="text-[10px] text-ink-4 p-3 text-center">
                    No other topics to link
                  </p>
                ) : (
                  connectableTopics.map(t => (
                    <button
                      key={t.id}
                      onClick={() => connectTopic(t.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left
                                 text-[11px] text-ink-2 hover:bg-surface-4 transition-colors"
                    >
                      <span>{t.emoji}</span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              {topic.connections.map(conn => (
                <ConnectionPill
                  key={conn.topicId}
                  conn={conn}
                  direction="outgoing"
                  onRemove={() => disconnectTopic(conn.topicId)}
                />
              ))}
              {topic.backlinks.map(bl => (
                <ConnectionPill
                  key={bl.topicId}
                  conn={bl}
                  direction="incoming"
                  onRemove={() => {}}
                />
              ))}
              {topic.connections.length === 0 && topic.backlinks.length === 0 && (
                <p className="text-[10px] text-ink-5 py-2 text-center border border-dashed
                               border-surface-5 rounded-lg">
                  No connections yet
                </p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="border-t border-surface-4 pt-4">
            <p className="text-[10px] text-ink-5">
              Updated {new Date(topic.updatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Summary input — editable on click
// ─────────────────────────────────────────────
function SummaryInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState(value)

  return editing ? (
    <textarea
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onChange(val) }}
      placeholder="Add a short summary of this topic..."
      rows={2}
      className="w-full text-sm text-ink-3 bg-surface-3 border border-brand/30
                 rounded-lg px-3 py-2 outline-none resize-none leading-relaxed"
    />
  ) : (
    <p
      onClick={() => setEditing(true)}
      className={`text-sm leading-relaxed cursor-text rounded-lg px-3 py-2
                  hover:bg-surface-3 transition-colors
                  ${val ? 'text-ink-3' : 'text-ink-5 italic'}`}
    >
      {val || 'Add a short summary of this topic...'}
    </p>
  )
}

// ─────────────────────────────────────────────
// Block Editor — single block
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Bookmark Embed Block
// ─────────────────────────────────────────────
function BookmarkEmbedBlock({ block, allBookmarks, onSelect, onDelete }: {
  block:        Block
  allBookmarks: any[]
  onSelect:     (bookmarkId: string) => void
  onDelete:     () => void
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [query,      setQuery]      = useState('')

  // block.content stores the bookmarkId once selected
  const selectedBookmark = block.content
    ? allBookmarks.find(b => b.id === block.content)
    : null

  const filtered = allBookmarks.filter(b =>
    (b.title ?? b.url).toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)

  if (selectedBookmark) {
    let domain = ''
    try { domain = new URL(selectedBookmark.url).hostname.replace('www.', '') } catch {}

    return (
      <div className="group my-1 relative">
        
          <a href={selectedBookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-surface-3 border border-surface-4
                     rounded-xl hover:border-brand/30 transition-colors"
        >
          {selectedBookmark.faviconUrl && (
            <div className="w-8 h-8 bg-surface-2 rounded-lg border border-surface-4
                            flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={selectedBookmark.faviconUrl} alt=""
                   className="w-5 h-5 object-contain"
                   onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink-1 truncate">
              {selectedBookmark.title ?? domain}
            </p>
            <p className="text-[10px] text-ink-4 truncate">{selectedBookmark.url}</p>
            {selectedBookmark.description && (
              <p className="text-[10px] text-ink-3 line-clamp-1 mt-0.5">
                {selectedBookmark.description}
              </p>
            )}
          </div>
          <svg className="w-3.5 h-3.5 text-ink-5 flex-shrink-0" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center
                     rounded-full bg-surface-2 border border-surface-4 text-ink-4
                     hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    )
  }

  // No bookmark selected yet — show search
  return (
    <div className="my-1 border border-dashed border-surface-5 rounded-xl p-3">
      <p className="text-[11px] text-ink-4 mb-2 flex items-center gap-1.5">
        <span>🔗</span> Select a bookmark to embed
      </p>
      <input
        autoFocus
        type="text"
        placeholder="Search your bookmarks..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-1.5 bg-surface-3 border border-surface-4 rounded-lg
                   text-xs text-ink-1 placeholder-ink-4 outline-none focus:border-brand
                   transition-colors mb-2"
      />
      <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
        {filtered.map(b => {
          let domain = ''
          try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
          return (
            <button
              key={b.id}
              onClick={() => {
                // Update block content with bookmarkId
                onSelect(b.id)
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                         hover:bg-surface-3 transition-colors"
            >
              {b.faviconUrl && (
                <img src={b.faviconUrl} alt="" className="w-3.5 h-3.5 flex-shrink-0"
                     onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <p className="text-[11px] text-ink-2 truncate">{b.title ?? domain}</p>
            </button>
          )
        })}
        {filtered.length === 0 && query && (
          <p className="text-[10px] text-ink-5 text-center py-2">No bookmarks found</p>
        )}
      </div>
      <button onClick={onDelete}
              className="mt-2 text-[10px] text-ink-5 hover:text-ink-3 transition-colors">
        Cancel
      </button>
    </div>
  )
}

function BlockEditor({ block, isActive, showMenu, onFocus, onBlur, onUpdate,
                       onEnter, onDelete, onMenuToggle, onChangeType, onAddBelow }: {
  block:          Block
  isActive:       boolean
  showMenu:       boolean
  onFocus:        () => void
  onBlur:         () => void
  onUpdate:       (content: string) => void
  onEnter:        () => void
  onDelete:       () => void
  onMenuToggle:   () => void
  onChangeType:   (type: string) => void
  onAddBelow:     (type: string) => void
}) {
  if (block.type === 'divider') {
    return (
      <div className="group flex items-center gap-2 py-2">
        <hr className="flex-1 border-surface-4" />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-ink-4
                     hover:text-red-400 transition-all"
        >×</button>
      </div>
    )
  }

  const classes: Record<string, string> = {
    heading1:  'text-2xl font-bold text-ink-1',
    heading2:  'text-xl font-semibold text-ink-1',
    heading3:  'text-base font-semibold text-ink-2',
    paragraph: 'text-sm text-ink-1 leading-relaxed',
    bullet:    'text-sm text-ink-1 leading-relaxed',
    code:      'text-xs text-green-400 font-mono bg-surface-3 rounded px-3 py-2',
    quote:     'text-sm text-ink-2 italic border-l-2 border-brand/40 pl-3',
  }
  const textClass = classes[block.type] ?? 'text-sm text-ink-1'

  return (
    <div className="group relative flex items-start gap-1">

      {/* Block type toggle button */}
      <div className="relative">
        <button
          onClick={onMenuToggle}
          className={`w-5 h-5 flex items-center justify-center rounded text-[9px]
                      font-mono mt-1 transition-all flex-shrink-0
                      ${isActive || showMenu
                        ? 'opacity-100 bg-surface-3 text-ink-3'
                        : 'opacity-0 group-hover:opacity-100 text-ink-4'}`}
        >
          ⋮⋮
        </button>

        {showMenu && (
          <div className="absolute left-6 top-0 z-20 w-44 bg-surface-2 border
                          border-surface-4 rounded-xl shadow-xl overflow-hidden py-1">
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => onChangeType(bt.type)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left
                            text-xs transition-colors
                            ${block.type === bt.type
                              ? 'bg-brand/10 text-brand-bright'
                              : 'text-ink-2 hover:bg-surface-3'}`}
              >
                <span className="w-5 text-[10px] font-mono text-center text-ink-4">
                  {bt.icon}
                </span>
                {bt.label}
              </button>
            ))}
            <div className="border-t border-surface-4 mt-1 pt-1">
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left
                           text-xs text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <span className="w-5 text-center text-[10px]">🗑</span>
                Delete block
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bullet prefix */}
      {block.type === 'bullet' && (
        <span className="text-ink-4 mt-1 flex-shrink-0 text-xs">•</span>
      )}

      {/* Editable content */}
      <div
        id={`block-${block.id}`}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onBlur={e => { onBlur(); onUpdate(e.currentTarget.textContent ?? '') }}
        onInput={e => onUpdate((e.target as HTMLElement).textContent ?? '')}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnter()
          }
          if (e.key === 'Backspace' && block.content === '') {
            e.preventDefault()
            onDelete()
          }
        }}
        className={`flex-1 outline-none min-h-[1.5em] ${textClass}
                    empty:before:content-[attr(data-placeholder)]
                    empty:before:text-ink-5 empty:before:pointer-events-none`}
        data-placeholder={
          block.type === 'heading1' ? 'Heading 1'
          : block.type === 'heading2' ? 'Heading 2'
          : block.type === 'heading3' ? 'Heading 3'
          : block.type === 'code' ? 'Code...'
          : block.type === 'quote' ? 'Quote...'
          : 'Write something...'
        }
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Reference search + add
// ─────────────────────────────────────────────
function ReferenceSearch({ bookmarks, onAdd, onClose }: {
  bookmarks: any[]
  onAdd:     (id: string) => void
  onClose:   () => void
}) {
  const [query, setQuery] = useState('')

  const filtered = bookmarks.filter(b =>
    (b.title ?? b.url).toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="mb-2 bg-surface-3 border border-surface-4 rounded-lg overflow-hidden">
      <input
        autoFocus
        type="text"
        placeholder="Search bookmarks..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-2 bg-transparent text-xs text-ink-1
                   placeholder-ink-4 outline-none border-b border-surface-4"
      />
      <div className="max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-ink-4 p-3 text-center">No bookmarks found</p>
        ) : (
          filtered.map(b => {
            let domain = ''
            try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
            return (
              <button
                key={b.id}
                onClick={() => onAdd(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left
                           hover:bg-surface-4 transition-colors"
              >
                {b.faviconUrl && (
                  <img src={b.faviconUrl} alt="" className="w-3.5 h-3.5 flex-shrink-0"
                       onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-1 truncate">{b.title ?? domain}</p>
                  <p className="text-[9px] text-ink-4 truncate">{domain}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
      <button
        onClick={onClose}
        className="w-full py-1.5 text-[10px] text-ink-4 hover:text-ink-2
                   transition-colors border-t border-surface-4"
      >
        Cancel
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Reference card in sidebar
// ─────────────────────────────────────────────
function ReferenceCard({ reference, onRemove }: { reference: Reference; onRemove: () => void }) {
  let domain = ''
  try { domain = new URL(reference.bookmark.url).hostname.replace('www.', '') } catch {}

  return (
    <div className="group flex items-start gap-2 p-2 bg-surface-3 border border-surface-4
                    rounded-lg hover:border-surface-5 transition-colors">
      {reference.bookmark.faviconUrl && (
        <img src={reference.bookmark.faviconUrl} alt=""
             className="w-4 h-4 flex-shrink-0 mt-0.5"
             onError={e => (e.currentTarget.style.display = 'none')} />
      )}
      <div className="flex-1 min-w-0">
        <a href={reference.bookmark.url} target="_blank" rel="noopener noreferrer"
           className="text-[11px] font-medium text-ink-1 truncate block
                      hover:text-brand-bright transition-colors">
          {reference.bookmark.title ?? domain}
        </a>
        <p className="text-[10px] text-ink-4 truncate">{domain}</p>
        {reference.note && (
          <p className="text-[10px] text-ink-3 mt-1 line-clamp-2 italic">
            {reference.note}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-400
                   transition-all flex-shrink-0"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Connection pill
// ─────────────────────────────────────────────
function ConnectionPill({ conn, direction, onRemove }: {
  conn:      Connection
  direction: 'incoming' | 'outgoing'
  onRemove:  () => void
}) {
  return (
    <div className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-3
                    border border-surface-4 rounded-lg hover:border-surface-5
                    transition-colors">
      <span className="text-[10px] text-ink-4 flex-shrink-0">
        {direction === 'outgoing' ? '→' : '←'}
      </span>
      <span className="text-xs">{conn.emoji}</span>
      <span className="text-[11px] text-ink-2 truncate flex-1">{conn.title}</span>
      {conn.label && (
        <span className="text-[9px] text-ink-4 italic truncate max-w-[50px]">
          {conn.label}
        </span>
      )}
      {direction === 'outgoing' && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-400
                     transition-all flex-shrink-0"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
