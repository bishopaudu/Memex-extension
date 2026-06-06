import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '../lib/api'

export function PublicCollectionPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const [data,     setData]     = useState<any | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (username && slug) fetchCollection()
  }, [username, slug])

  async function fetchCollection() {
    setLoading(true)
    const r = await publicApi.getCollection(username!, slug!)
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
        <h1 className="text-lg font-semibold text-ink-1 mb-2">Collection not found</h1>
        <p className="text-sm text-ink-3 mb-6">
          This collection doesn't exist or isn't public
        </p>
        <a href="/" className="text-sm text-brand-bright hover:underline">
          ← Go to Memex
        </a>
      </div>
    )
  }

  const { author, collection, bookmarks } = data

  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center
                          text-white font-bold text-xs">M</div>
          <div className="text-xs text-ink-3">
            <span className="text-ink-1 font-medium">{author.name || author.username}</span>
            <span className="text-ink-5 mx-1">/</span>
            <span>Collections</span>
          </div>
        </div>
        <a href="/"
           className="text-xs px-3 py-1.5 bg-brand text-white rounded-lg
                      hover:bg-brand/90 transition-colors">
          Get Memex free
        </a>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Collection header */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-surface-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center
                       text-3xl border flex-shrink-0"
            style={{
              background:  collection.color + '15',
              borderColor: collection.color + '30',
            }}
          >
            {collection.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-1 mb-1">{collection.name}</h1>
            {collection.description && (
              <p className="text-sm text-ink-3">{collection.description}</p>
            )}
            <p className="text-xs text-ink-4 mt-1">
              {bookmarks.length} bookmarks · curated by {author.name || author.username}
            </p>
          </div>
        </div>

        {/* Bookmarks grid */}
        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-ink-3">No bookmarks in this collection yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.map((b: any) => {
              let domain = ''
              try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}

              return (
                
                  <a key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col bg-surface-2 border border-surface-4
                             rounded-2xl overflow-hidden hover:border-brand/30
                             hover:shadow-lg hover:shadow-black/20 transition-all
                             hover:-translate-y-0.5"
                >
                  {/* OG image */}
                  {b.ogImageUrl && (
                    <div className="aspect-video overflow-hidden bg-surface-3">
                      <img src={b.ogImageUrl} alt=""
                           className="w-full h-full object-cover group-hover:scale-105
                                      transition-transform duration-300"
                           onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      {b.faviconUrl && (
                        <img src={b.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
                             onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                      <span className="text-[10px] text-ink-4 truncate">{domain}</span>
                    </div>

                    <p className="text-sm font-semibold text-ink-1 leading-snug mb-2
                                  group-hover:text-brand-bright transition-colors line-clamp-2">
                      {b.title || domain}
                    </p>

                    {b.description && (
                      <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2
                                    flex-1">
                        {b.description}
                      </p>
                    )}

                    {b.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {b.tags.slice(0, 3).map((tag: any) => (
                          <span key={tag.id}
                                className="text-[9px] px-2 py-0.5 bg-brand/10
                                           text-brand-bright rounded-full">
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}

        {/* Footer CTA */}
        <div className="border-t border-surface-4 mt-12 pt-8 flex flex-col
                        items-center text-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center
                            text-white font-bold text-sm">M</div>
            <span className="font-semibold text-ink-1">Memex</span>
          </div>
          <p className="text-sm text-ink-3 max-w-xs">
            Save, organize and share your bookmarks with Memex.
            Build your personal knowledge base.
          </p>
          <a href="/"
             className="px-6 py-2.5 bg-brand text-white text-sm font-medium
                        rounded-xl hover:bg-brand/90 transition-colors">
            Start for free
          </a>
        </div>
      </main>
    </div>
  )
}