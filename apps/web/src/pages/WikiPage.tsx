import { useState } from 'react'
import { TopicGraph } from '../components/TopicGraph'
import { topicsApi } from '../lib/api'

interface Topic {
  id:         string
  title:      string
  emoji:      string
  summary:    string | null
  coverColor: string
  blockCount: number
  refCount:   number
  updatedAt:  string
}

interface Props {
  topics:         Topic[]
  theme:          'dark' | 'light'
  onOpenTopic:    (id: string) => void
  onTopicsChange: () => void
}

const COVER_COLORS = [
  '#4f6ef7','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
]

const DEFAULT_EMOJIS = ['📄','🧠','💡','🔬','🎯','⚡','🌐','📊','🏗️','🎨','🚀','📚']

export function WikiPage({ topics, theme, onOpenTopic, onTopicsChange }: Props) {
  const [creating,   setCreating]   = useState(false)
  const [showGraph,  setShowGraph]  = useState(false)
  const [newTitle,   setNewTitle]   = useState('')
  const [newEmoji,   setNewEmoji]   = useState('📄')
  const [newColor,   setNewColor]   = useState(COVER_COLORS[0])
  const [saving,     setSaving]     = useState(false)
  const [searchQ,    setSearchQ]    = useState('')

  async function handleCreate() {
    if (!newTitle.trim()) return
    setSaving(true)
    const r = await topicsApi.create({
      title:      newTitle.trim(),
      emoji:      newEmoji,
      coverColor: newColor,
    })
    setSaving(false)
    setCreating(false)
    setNewTitle('')
    onTopicsChange()
    if (!r.error) onOpenTopic(r.data.topic.id)
  }

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 3600)   return `${Math.floor(s / 60)}m ago`
    if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filtered = topics.filter(t =>
    t.title.toLowerCase().includes(searchQ.toLowerCase())
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
            🧠 Wiki
          </span>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4
                         rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                         focus:border-brand transition-colors"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-semibold text-ink-1 flex items-center gap-2">
              🧠 Knowledge Wiki
            </h1>
            <p className="text-[11px] text-ink-4 mt-0.5">
              {topics.length} {topics.length === 1 ? 'topic' : 'topics'} · Your personal Wikipedia
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
            New topic
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="mb-6 p-4 bg-surface-2 border border-brand/20 rounded-2xl">
            <p className="text-xs font-medium text-ink-2 mb-3">Create new topic</p>

            <div className="flex gap-3 mb-3">
              <div>
                <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Emoji</p>
                <div className="flex flex-wrap gap-1 w-32">
                  {DEFAULT_EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                            className={`w-7 h-7 rounded-lg text-sm transition-colors
                                        ${newEmoji === e ? 'bg-brand/20 ring-1 ring-brand/40' : 'hover:bg-surface-3'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Title</p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Topic title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                    className="w-full px-3 py-2 bg-surface-3 border border-surface-4
                               rounded-lg text-xs text-ink-1 outline-none focus:border-brand
                               placeholder-ink-4 transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5">Cover color</p>
                  <div className="flex gap-2">
                    {COVER_COLORS.map(c => (
                      <button key={c} onClick={() => setNewColor(c)}
                              style={{ background: c }}
                              className={`w-5 h-5 rounded-full transition-transform
                                          ${newColor === c ? 'scale-125 ring-2 ring-white/20' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving || !newTitle.trim()}
                className="flex-1 py-2 bg-brand text-white text-xs font-medium
                           rounded-lg disabled:opacity-40 hover:bg-brand/90 transition-colors"
              >
                {saving ? 'Creating...' : 'Create & open'}
              </button>
              <button onClick={() => { setCreating(false); setNewTitle('') }}
                      className="px-4 py-2 text-ink-3 text-xs hover:text-ink-1 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-sm font-medium text-ink-2 mb-1">
              {searchQ ? 'No topics match' : 'Your wiki is empty'}
            </p>
            <p className="text-xs text-ink-4 mb-4 max-w-sm">
              {searchQ
                ? 'Try a different search'
                : 'Create topics to capture your knowledge. Each topic is a wiki page where you write your understanding and attach your saved bookmarks as references.'}
            </p>
            {!searchQ && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white
                           text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors"
              >
                Create your first topic
              </button>
            )}
          </div>
        )}

        {/* Topic grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onClick={() => onOpenTopic(topic.id)}
                onDelete={async () => {
                  await topicsApi.delete(topic.id)
                  onTopicsChange()
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
// Topic card
// ─────────────────────────────────────────────
function TopicCard({ topic, onClick, onDelete, timeAgo }: {
  topic:    Topic
  onClick:  () => void
  onDelete: () => void
  timeAgo:  (d: string) => string
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface-2 border border-surface-4 rounded-2xl
                 overflow-hidden cursor-pointer transition-all duration-200
                 hover:border-surface-5 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Color bar */}
      <div className="h-1" style={{ background: topic.coverColor }} />

      <div className="p-4">
        {/* Emoji + delete */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl leading-none group-hover:scale-110
                           transition-transform duration-200 inline-block">
            {topic.emoji}
          </span>

          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={onDelete}
                      className="text-[10px] text-red-400 px-2 py-1 bg-red-400/10
                                 border border-red-400/20 rounded">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                      className="text-[10px] text-ink-3 px-1">×</button>
            </div>
          ) : (
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
        </div>

        <p className="text-xs font-semibold text-ink-1 mb-1 leading-snug">
          {topic.title}
        </p>

        {topic.summary && (
          <p className="text-[10px] text-ink-4 leading-relaxed line-clamp-2 mb-2">
            {topic.summary}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 pt-2 border-t border-surface-4">
          <span className="text-[10px] text-ink-5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {topic.blockCount} blocks
          </span>
          <span className="text-[10px] text-ink-5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            {topic.refCount} refs
          </span>
          <span className="text-[10px] text-ink-5 ml-auto">
            {timeAgo(topic.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
