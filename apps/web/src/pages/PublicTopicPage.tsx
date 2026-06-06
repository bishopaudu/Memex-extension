import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicApi } from '../lib/api'

export function PublicTopicPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const [data,    setData]    = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (username && slug) fetchTopic()
  }, [username, slug])

  async function fetchTopic() {
    setLoading(true)
    const r = await publicApi.getTopic(username!, slug!)
    if (r.error) setNotFound(true)
    else setData(r.data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center
                      justify-center text-center p-6">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-lg font-semibold text-ink-1 mb-2">Topic not found</h1>
        <p className="text-sm text-ink-3 mb-6">
          This topic doesn't exist or isn't public
        </p>
        <a href="/" className="text-sm text-brand-bright hover:underline">
          ← Go to Memex
        </a>
      </div>
    )
  }

  const { author, topic } = data

  return (
    <div className="min-h-screen bg-surface-0">

      {/* ── NAV ── */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center
                          text-white font-bold text-xs">M</div>
          <div className="text-xs text-ink-3">
            <span className="text-ink-1 font-medium">{author.name || author.username}</span>
            <span className="text-ink-5 mx-1">/</span>
            <span>Wiki</span>
          </div>
        </div>
        <a href="/"
           className="text-xs px-3 py-1.5 bg-brand text-white rounded-lg
                      hover:bg-brand/90 transition-colors">
          Get Memex free
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Color bar */}
        <div className="h-1 rounded-full mb-8 max-w-xs"
             style={{ background: topic.coverColor }} />

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <span className="text-5xl leading-none mt-1">{topic.emoji}</span>
          <div>
            <h1 className="text-3xl font-bold text-ink-1 leading-tight mb-2">
              {topic.title}
            </h1>
            {topic.summary && (
              <p className="text-sm text-ink-3 leading-relaxed max-w-2xl">
                {topic.summary}
              </p>
            )}
            <p className="text-[11px] text-ink-5 mt-2">
              by {author.name || author.username} ·{' '}
              {new Date(topic.updatedAt).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Blocks */}
        <div className="flex flex-col gap-1 mb-12">
          {topic.blocks.map((block: any) => (
            <PublicBlock key={block.id} block={block} />
          ))}
        </div>

        {/* References */}
        {topic.references.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-4">
              References ({topic.references.length})
            </h2>
            <div className="flex flex-col gap-2">
              {topic.references.map((ref: any) => (
                <a key={ref.bookmarkId}
                   href={ref.bookmark.url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-surface-2 border
                              border-surface-4 rounded-xl hover:border-brand/30
                              hover:bg-surface-3 transition-all group">
                  {ref.bookmark.faviconUrl && (
                    <img src={ref.bookmark.faviconUrl} alt=""
                         className="w-5 h-5 flex-shrink-0"
                         onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-1 truncate
                                  group-hover:text-brand-bright transition-colors">
                      {ref.bookmark.title || ref.bookmark.url}
                    </p>
                    <p className="text-[10px] text-ink-4 truncate">
                      {ref.bookmark.url}
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3
                                  flex-shrink-0 transition-colors"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Connected topics */}
        {topic.connections.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-4">
              Connected topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {topic.connections.map((conn: any) => (
                <a key={conn.topicId}
                   href={`/p/${username}/topic/${conn.slug}`}
                   className="flex items-center gap-2 px-3 py-2 bg-surface-2
                              border border-surface-4 rounded-xl text-sm
                              hover:border-brand/30 hover:bg-surface-3 transition-all">
                  <span>{conn.emoji}</span>
                  <span className="text-ink-2 font-medium">{conn.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="border-t border-surface-4 pt-8 flex flex-col items-center
                        text-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center
                            text-white font-bold text-sm">M</div>
            <span className="font-semibold text-ink-1">Memex</span>
          </div>
          <p className="text-sm text-ink-3 max-w-xs">
            Build your own visual knowledge wiki. Save anything from the web,
            connect your ideas, share your knowledge.
          </p>
          <a href="/"
             className="px-6 py-2.5 bg-brand text-white text-sm font-medium
                        rounded-xl hover:bg-brand/90 transition-colors">
            Start building your wiki — it's free
          </a>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────
// Read-only block renderer
// ─────────────────────────────────────────────
function PublicBlock({ block }: { block: any }) {
  if (block.type === 'divider') {
    return <hr className="border-surface-4 my-4" />
  }

  const content = block.content || ''
  if (!content && block.type !== 'divider') return null

  const classes: Record<string, string> = {
    heading1:  'text-2xl font-bold text-ink-1 mt-8 mb-2',
    heading2:  'text-xl font-semibold text-ink-1 mt-6 mb-2',
    heading3:  'text-base font-semibold text-ink-2 mt-4 mb-1',
    paragraph: 'text-sm text-ink-1 leading-relaxed',
    bullet:    'text-sm text-ink-1 leading-relaxed flex gap-2',
    code:      'text-xs text-green-400 font-mono bg-surface-3 rounded-xl px-4 py-3 my-2',
    quote:     'text-sm text-ink-2 italic border-l-2 pl-4 py-1 my-2',
  }

  const cls = classes[block.type] ?? 'text-sm text-ink-1'

  // Quote gets special border color
  const style = block.type === 'quote' ? { borderColor: '#4f6ef760' } : {}

  return (
    <div className={cls} style={style}>
      {block.type === 'bullet' && (
        <span className="text-ink-4 flex-shrink-0 mt-0.5">•</span>
      )}
      <span>{content}</span>
    </div>
  )
}