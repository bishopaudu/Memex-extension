import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicApi } from '../lib/api'

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [data,     setData]     = useState<any | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (username) fetchProfile()
  }, [username])

  async function fetchProfile() {
    setLoading(true)
    const r = await publicApi.getProfile(username!)
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
        <p className="text-4xl mb-4">👤</p>
        <h1 className="text-lg font-semibold text-ink-1 mb-2">Profile not found</h1>
        <a href="/" className="text-sm text-brand-bright hover:underline">
          ← Go to Memex
        </a>
      </div>
    )
  }

  const { user, topics, collections } = data
  const hasContent = topics.length > 0 || collections.length > 0

  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center
                          text-white font-bold text-xs">M</div>
          <span className="font-semibold text-ink-1 text-sm">Memex</span>
        </div>
        <a href="/"
           className="text-xs px-3 py-1.5 bg-brand text-white rounded-lg
                      hover:bg-brand/90 transition-colors">
          Get Memex free
        </a>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Profile header */}
        <div className="flex items-center gap-5 mb-12 pb-12 border-b border-surface-4">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center
                          justify-center text-2xl font-bold text-brand-bright flex-shrink-0">
            {(user.name || user.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-1 mb-0.5">
              {user.name || user.username}
            </h1>
            <p className="text-sm text-ink-4">@{user.username}</p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-4">
              {topics.length > 0 && (
                <span>{topics.length} public {topics.length === 1 ? 'topic' : 'topics'}</span>
              )}
              {collections.length > 0 && (
                <span>{collections.length} public {collections.length === 1 ? 'collection' : 'collections'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!hasContent && (
          <div className="text-center py-16">
            <p className="text-sm text-ink-3 mb-1">Nothing public yet</p>
            <p className="text-xs text-ink-4">
              This user hasn't shared any topics or collections yet
            </p>
          </div>
        )}

        {/* Public topics */}
        {topics.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm font-semibold text-ink-1 mb-4 flex items-center gap-2">
              🧠 Wiki topics
              <span className="text-[11px] text-ink-4 font-normal">({topics.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic: any) => (
                
                  <a key={topic.id}
                  href={`/p/${username}/topic/${topic.slug}`}
                  className="group bg-surface-2 border border-surface-4 rounded-2xl
                             overflow-hidden hover:border-brand/30 hover:shadow-lg
                             hover:shadow-black/20 transition-all hover:-translate-y-0.5"
                >
                  <div className="h-1" style={{ background: topic.coverColor }} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{topic.emoji}</span>
                    </div>
                    <p className="text-xs font-semibold text-ink-1 mb-1
                                  group-hover:text-brand-bright transition-colors">
                      {topic.title}
                    </p>
                    {topic.summary && (
                      <p className="text-[10px] text-ink-4 line-clamp-2 leading-relaxed">
                        {topic.summary}
                      </p>
                    )}
                    <p className="text-[9px] text-ink-5 mt-2">
                      {new Date(topic.updatedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Public collections */}
        {collections.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm font-semibold text-ink-1 mb-4 flex items-center gap-2">
              📁 Collections
              <span className="text-[11px] text-ink-4 font-normal">({collections.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col: any) => (
                
                 <a key={col.id}
                  href={`/p/${username}/collection/${col.slug}`}
                  className="group flex items-center gap-3 p-4 bg-surface-2
                             border border-surface-4 rounded-2xl hover:border-brand/30
                             hover:shadow-lg hover:shadow-black/20 transition-all
                             hover:-translate-y-0.5"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center
                               text-xl flex-shrink-0"
                    style={{ background: col.color + '20', border: `1px solid ${col.color}30` }}
                  >
                    {col.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-1 truncate
                                  group-hover:text-brand-bright transition-colors">
                      {col.name}
                    </p>
                    {col.description && (
                      <p className="text-[10px] text-ink-4 truncate">{col.description}</p>
                    )}
                  </div>
                  <svg className="w-3.5 h-3.5 text-ink-5 group-hover:text-ink-3
                                  transition-colors flex-shrink-0" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-surface-4 pt-8 flex flex-col items-center
                        text-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center
                            text-white font-bold text-sm">M</div>
            <span className="font-semibold text-ink-1">Memex</span>
          </div>
          <p className="text-sm text-ink-3 max-w-xs">
            Build your own visual knowledge wiki. Save anything, connect ideas, share knowledge.
          </p>
          <a href="/"
             className="px-6 py-2.5 bg-brand text-white text-sm font-medium
                        rounded-xl hover:bg-brand/90 transition-colors">
            Start building — it's free
          </a>
        </div>
      </main>
    </div>
  )
}
