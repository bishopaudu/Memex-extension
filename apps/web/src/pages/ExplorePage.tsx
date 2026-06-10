import { useState, useEffect } from 'react'

type Filter = 'all' | 'topics' | 'collections' | 'bookmarks'

export function ExplorePage() {
  const [data,    setData]    = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('all')

  useEffect(() => { fetchExplore() }, [filter])

  async function fetchExplore() {
    setLoading(true)
    try {
      const r    = await fetch(`http://localhost:3001/p/explore?type=${filter}`)
      const json = await r.json()
      if (!json.error) setData(json.data)
    } catch {}
    setLoading(false)
  }

  const topics      = (data.topics      ?? []) as any[]
  const collections = (data.collections ?? []) as any[]
  const bookmarks   = (data.bookmarks   ?? []) as any[]
  const hasContent  = topics.length > 0 || collections.length > 0 || bookmarks.length > 0

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
        <div className="flex items-center gap-2">
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

        {/* Topics grid */}
        {!loading && topics.length > 0 && (
          <section className="mb-12">
            {filter === 'all' && (
              <h2 className="text-sm font-semibold text-ink-1 mb-4 flex items-center gap-2">
                🧠 Wiki Topics
                <span className="text-[11px] text-ink-4 font-normal">
                  ({topics.length})
                </span>
              </h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                            xl:grid-cols-4 gap-4">
              {topics.map((topic: any) => (
                <a key={topic.id}
                   href={`/p/${topic.username}/topic/${topic.slug}`}
                   className="group bg-surface-2 border border-surface-4 rounded-2xl
                              overflow-hidden hover:border-brand/30 hover:shadow-lg
                              hover:shadow-black/20 transition-all hover:-translate-y-0.5">
                  <div className="h-1" style={{ background: topic.cover_color }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{topic.emoji}</span>
                      <span className="text-[10px] text-ink-5">
                        {topic.ref_count} refs
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink-1 mb-1
                                  group-hover:text-brand-bright transition-colors
                                  line-clamp-2">
                      {topic.title}
                    </p>
                    {topic.summary && (
                      <p className="text-[10px] text-ink-4 line-clamp-2
                                    leading-relaxed">
                        {topic.summary}
                      </p>
                    )}
                    <p className="text-[9px] text-ink-5 mt-2">
                      by {topic.user_name || topic.username}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Collections grid */}
        {!loading && collections.length > 0 && (
          <section className="mb-12">
            {filter === 'all' && (
              <h2 className="text-sm font-semibold text-ink-1 mb-4 flex items-center gap-2">
                📁 Collections
                <span className="text-[11px] text-ink-4 font-normal">
                  ({collections.length})
                </span>
              </h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col: any) => (
                <a key={col.id}
                   href={`/p/${col.username}/collection/${col.slug}`}
                   className="group flex items-center gap-3 p-4 bg-surface-2
                              border border-surface-4 rounded-2xl
                              hover:border-brand/30 hover:shadow-lg
                              hover:shadow-black/20 transition-all
                              hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl flex items-center
                                  justify-center text-xl flex-shrink-0"
                       style={{ background: col.color + '20',
                                border: `1px solid ${col.color}30` }}>
                    {col.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-1 truncate
                                  group-hover:text-brand-bright transition-colors">
                      {col.name}
                    </p>
                    <p className="text-[10px] text-ink-4">
                      {col.bookmark_count} bookmarks
                      <span className="mx-1">·</span>
                      by {col.user_name || col.username}
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3
                                  transition-colors flex-shrink-0" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Bookmarks masonry */}
        {!loading && bookmarks.length > 0 && (
          <section>
            {filter === 'all' && (
              <h2 className="text-sm font-semibold text-ink-1 mb-4 flex items-center gap-2">
                🔖 Bookmarks
                <span className="text-[11px] text-ink-4 font-normal">
                  ({bookmarks.length})
                </span>
              </h2>
            )}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {bookmarks.map((b: any) => {
                let domain = ''
                try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
                const img = b.screenshot_url ?? b.og_image_url

                return (
                  <a key={b.id}
                     href={`/p/b/${b.public_slug}`}
                     className="group block break-inside-avoid mb-4 bg-surface-2
                                border border-surface-4 rounded-2xl overflow-hidden
                                hover:border-brand/30 hover:shadow-lg
                                hover:shadow-black/20 transition-all
                                hover:-translate-y-0.5">
                    {img && (
                      <div className="w-full overflow-hidden bg-surface-3">
                        <img src={img} alt=""
                             className="w-full object-cover group-hover:scale-105
                                        transition-transform duration-300"
                             onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {b.favicon_url && (
                          <img src={b.favicon_url} alt="" className="w-3.5 h-3.5"
                               onError={e => (e.currentTarget.style.display = 'none')} />
                        )}
                        <span className="text-[10px] text-ink-4 truncate">
                          {domain}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-ink-1 line-clamp-2
                                    group-hover:text-brand-bright transition-colors
                                    mb-1">
                        {b.title || domain}
                      </p>
                      {b.description && (
                        <p className="text-[10px] text-ink-4 line-clamp-2
                                      leading-relaxed">
                          {b.description}
                        </p>
                      )}
                      <p className="text-[9px] text-ink-5 mt-2">
                        by {b.user_name || b.username}
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
