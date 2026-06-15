import { useState, useEffect } from 'react'
import { API_BASE } from '../lib/config'

type Filter = 'all' | 'topics' | 'collections' | 'bookmarks'

interface FeedItem {
  kind: 'topic' | 'collection' | 'bookmark'
  data: any
}

export function ExplorePage() {
  const [data,    setData]    = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('all')

  useEffect(() => { fetchExplore() }, [filter])

  async function fetchExplore() {
    setLoading(true)
    try {
      const r    = await fetch(`${API_BASE}/p/explore?type=${filter}`)
      const json = await r.json()
      if (!json.error) setData(json.data)
    } catch {}
    setLoading(false)
  }

  const topics      = (data.topics      ?? []) as any[]
  const collections = (data.collections ?? []) as any[]
  const bookmarks   = (data.bookmarks   ?? []) as any[]

  // Unified feed — interleave for a natural Pinterest mix
  const feed: FeedItem[] = []
  const maxLen = Math.max(topics.length, collections.length, bookmarks.length)
  for (let i = 0; i < maxLen; i++) {
    if (topics[i])      feed.push({ kind: 'topic',      data: topics[i] })
    if (bookmarks[i])    feed.push({ kind: 'bookmark',   data: bookmarks[i] })
    if (bookmarks[i+1])  feed.push({ kind: 'bookmark',   data: bookmarks[i+1] })
    if (collections[i]) feed.push({ kind: 'collection', data: collections[i] })
  }

  const hasContent = feed.length > 0

  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">M</div>
          <span className="font-semibold text-ink-1 text-sm">Memex</span>
          <span className="text-ink-5 text-xs">/</span>
          <span className="text-xs text-ink-3">Explore</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/help" className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Help</a>
          <a href="/about" className="text-xs text-ink-3 hover:text-ink-1 transition-colors">About</a>
          <a href="/auth"
             className="text-xs text-ink-3 hover:text-ink-1 transition-colors">
            Sign in
          </a>
          <a href="/auth"
             className="text-xs px-3 py-1.5 bg-brand text-white rounded-lg
                        hover:bg-brand/90 transition-colors">
            Get started free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center py-14 px-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-ink-1 mb-3">
          Explore public knowledge
        </h1>
        <p className="text-sm text-ink-3 leading-relaxed">
          Discover bookmarks, collections, and wiki topics shared by the Memex community.
          Find ideas, save what inspires you, build your own knowledge base.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-center gap-2 mb-8 px-6">
        {([
          { key: 'all',         label: '✨ All'         },
          { key: 'topics',      label: '🧠 Wiki topics' },
          { key: 'collections', label: '📁 Collections' },
          { key: 'bookmarks',   label: '🔖 Bookmarks'  },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors
                        ${filter === f.key
                          ? 'bg-brand text-white'
                          : 'bg-surface-2 border border-surface-4 text-ink-3 hover:text-ink-1'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto px-6 pb-16">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}

        {!loading && !hasContent && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🌱</p>
            <p className="text-sm font-medium text-ink-2 mb-1">
              Nothing public yet
            </p>
            <p className="text-xs text-ink-4 mb-6">
              Be the first to share your knowledge
            </p>
            <a href="/auth"
               className="text-sm text-brand-bright hover:underline">
              Create your account →
            </a>
          </div>
        )}

        {/* Unified Pinterest masonry feed */}
        {!loading && hasContent && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {feed.map((item, i) => (
              <div key={`${item.kind}-${item.data.id}-${i}`}
                   className="break-inside-avoid mb-4">
                {item.kind === 'topic'      && <TopicCard      t={item.data} />}
                {item.kind === 'collection' && <CollectionCard c={item.data} />}
                {item.kind === 'bookmark'   && <BookmarkCard   b={item.data} />}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-4 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between
                        text-[11px] text-ink-4">
          <span>© {new Date().getFullYear()} Memex</span>
          <div className="flex items-center gap-4">
            <a href="/about"    className="hover:text-ink-2 transition-colors">About</a>
            <a href="/help"     className="hover:text-ink-2 transition-colors">Help</a>
            <a href="/feedback" className="hover:text-ink-2 transition-colors">Feedback</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────
// Author chip — shown at the bottom of every card
// ─────────────────────────────────────────────
function AuthorChip({ username, name, avatarUrl }: {
  username: string; name?: string; avatarUrl?: string
}) {
  const initial = (name || username || '?')[0].toUpperCase()
  return (
    <a href={`/p/${username}`}
       onClick={e => e.stopPropagation()}
       className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      <div className="w-4 h-4 rounded-full overflow-hidden bg-brand/20
                      flex items-center justify-center flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[8px] font-bold text-brand-bright">{initial}</span>
        )}
      </div>
      <span className="text-[10px] text-ink-4 truncate">
        {name || username}
      </span>
    </a>
  )
}

// ─────────────────────────────────────────────
// Topic card
// ─────────────────────────────────────────────
function TopicCard({ t }: { t: any }) {
  return (
    <a href={`/p/${t.username}/topic/${t.slug}`}
       className="group block bg-surface-2 border border-surface-4 rounded-2xl
                  overflow-hidden hover:border-brand/30 hover:shadow-lg
                  hover:shadow-black/20 transition-all hover:-translate-y-0.5">
      {/* Cover */}
      <div className="h-20 flex items-center justify-center relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${t.cover_color}25, ${t.cover_color}05)` }}>
        <span className="text-4xl">{t.emoji}</span>
        <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5
                         bg-surface-2/80 text-ink-3 rounded-full border border-surface-4">
          🧠 Wiki
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-ink-1 mb-1 line-clamp-2
                      group-hover:text-brand-bright transition-colors">
          {t.title}
        </p>
        {t.summary && (
          <p className="text-[11px] text-ink-4 line-clamp-3 leading-relaxed mb-3">
            {t.summary}
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-surface-4">
          <AuthorChip username={t.username} name={t.user_name} avatarUrl={t.avatar_url} />
          <span className="text-[9px] text-ink-5">
            {new Date(t.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </a>
  )
}

// ─────────────────────────────────────────────
// Collection card
// ─────────────────────────────────────────────
function CollectionCard({ c }: { c: any }) {
  return (
    <a href={`/p/${c.username}/collection/${c.slug}`}
       className="group block bg-surface-2 border border-surface-4 rounded-2xl
                  overflow-hidden hover:border-brand/30 hover:shadow-lg
                  hover:shadow-black/20 transition-all hover:-translate-y-0.5">
      {/* Cover */}
      <div className="h-20 flex items-center justify-center relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${c.color}25, ${c.color}05)` }}>
        <span className="text-4xl">{c.icon}</span>
        <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5
                         bg-surface-2/80 text-ink-3 rounded-full border border-surface-4">
          📁 Collection
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-ink-1 mb-1 line-clamp-2
                      group-hover:text-brand-bright transition-colors">
          {c.name}
        </p>
        {c.description ? (
          <p className="text-[11px] text-ink-4 line-clamp-2 leading-relaxed mb-2">
            {c.description}
          </p>
        ) : (
          <p className="text-[11px] text-ink-4 mb-2">
            {c.bookmark_count} bookmark{c.bookmark_count === 1 ? '' : 's'}
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-surface-4">
          <AuthorChip username={c.username} name={c.user_name} avatarUrl={c.avatar_url} />
          <span className="text-[9px] text-ink-5">
            {c.bookmark_count} saved
          </span>
        </div>
      </div>
    </a>
  )
}

// ─────────────────────────────────────────────
// Bookmark card — Pinterest style with image
// ─────────────────────────────────────────────
function BookmarkCard({ b }: { b: any }) {
  let domain = ''
  try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
  const img = b.screenshot_url ?? b.og_image_url

  return (
    <a href={`/p/b/${b.public_slug}`}
       className="group block bg-surface-2 border border-surface-4 rounded-2xl
                  overflow-hidden hover:border-brand/30 hover:shadow-lg
                  hover:shadow-black/20 transition-all hover:-translate-y-0.5">
      {img ? (
        <div className="w-full overflow-hidden bg-surface-3">
          <img src={img} alt=""
               className="w-full object-cover group-hover:scale-105
                          transition-transform duration-300"
               onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center bg-surface-3">
          <span className="text-3xl opacity-40">🔖</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {b.favicon_url && (
            <img src={b.favicon_url} alt="" className="w-3.5 h-3.5 flex-shrink-0"
                 onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <span className="text-[10px] text-ink-4 truncate">{domain}</span>
        </div>
        <p className="text-xs font-medium text-ink-1 line-clamp-2
                      group-hover:text-brand-bright transition-colors mb-1">
          {b.title || domain}
        </p>
        {b.description && (
          <p className="text-[10px] text-ink-4 line-clamp-2 leading-relaxed mb-2">
            {b.description}
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-surface-4">
          <AuthorChip username={b.username} name={b.user_name} avatarUrl={b.avatar_url} />
          <span className="text-[9px] text-ink-5">🔖</span>
        </div>
      </div>
    </a>
  )
}
