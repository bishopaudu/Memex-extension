import { useState, useEffect, useRef } from 'react'
import { bookmarksApi } from '../lib/api'

interface Props {
  onOpenBookmark: (id: string) => void
}

export function DailyRediscovery({ onOpenBookmark }: Props) {
  const [items,     setItems]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [current,   setCurrent]   = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    const today     = new Date().toDateString()
    const lastShown = localStorage.getItem('memex_rediscovery_date')
    const cached    = localStorage.getItem('memex_rediscovery_items')
    const wasDismissed = localStorage.getItem('memex_rediscovery_dismissed')

    if (wasDismissed === today) {
      setDismissed(true)
      setLoading(false)
      return
    }

    if (lastShown === today && cached) {
      setItems(JSON.parse(cached))
      setLoading(false)
      return
    }

    fetchItems(today)
  }, [])

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setInterval(() => {
      goNext()
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [items.length, current])

  async function fetchItems(today: string) {
    setLoading(true)
    const r = await bookmarksApi.list({ limit: 50 } as any)
    if (!r.error && r.data.items.length >= 3) {
      const shuffled = [...r.data.items]
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
      setItems(shuffled)
      localStorage.setItem('memex_rediscovery_date',  today)
      localStorage.setItem('memex_rediscovery_items', JSON.stringify(shuffled))
    }
    setLoading(false)
  }

  function goNext() {
    if (animating || items.length === 0) return
    setAnimating(true)
    setCurrent(prev => (prev + 1) % items.length)
    setTimeout(() => setAnimating(false), 300)
  }

  function goPrev() {
    if (animating || items.length === 0) return
    setAnimating(true)
    setCurrent(prev => (prev - 1 + items.length) % items.length)
    setTimeout(() => setAnimating(false), 300)
  }

  function handleDismiss() {
    const today = new Date().toDateString()
    localStorage.setItem('memex_rediscovery_dismissed', today)
    setDismissed(true)
  }

  if (dismissed || loading || items.length === 0) return null

  const item    = items[current]
  let   domain  = ''
  try { domain = new URL(item.url).hostname.replace('www.', '') } catch {}

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 30)  return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`
  }

  const heroImage = item.screenshotUrl ?? item.ogImageUrl

  return (
    <div className="mb-6 bg-surface-2 border border-surface-4 rounded-2xl
                    overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5
                      border-b border-surface-4">
        <div className="flex items-center gap-2">
          <span>✨</span>
          <p className="text-xs font-semibold text-ink-1">From your past</p>
          <span className="text-[10px] text-ink-5">
            Saved {timeAgo(item.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Dots indicator */}
          <div className="flex items-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${
                  i === current
                    ? 'w-3 h-1.5 bg-brand'
                    : 'w-1.5 h-1.5 bg-surface-5 hover:bg-surface-6'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="text-ink-5 hover:text-ink-3 transition-colors text-sm ml-1"
          >
            ×
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden">
        <div
          className="flex items-start cursor-pointer"
          style={{
            transform:  `translateX(-${current * 100}%)`,
            transition: animating ? 'transform 0.3s ease' : 'none',
            width:      `${items.length * 100}%`,
          }}
        >
          {items.map((b, i) => {
            let bDomain = ''
            try { bDomain = new URL(b.url).hostname.replace('www.', '') } catch {}
            const bImage = b.screenshotUrl ?? b.ogImageUrl

            return (
              <div
                key={b.id}
                style={{ width: `${100 / items.length}%` }}
                onClick={() => onOpenBookmark(b.id)}
                className="flex gap-4 p-4 hover:bg-surface-3 transition-colors"
              >
                {/* Thumbnail */}
                {bImage && (
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-surface-3
                                  flex-shrink-0 border border-surface-4">
                    <img
                      src={bImage}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {b.faviconUrl && (
                      <img src={b.faviconUrl} alt=""
                           className="w-3.5 h-3.5 flex-shrink-0"
                           onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <span className="text-[10px] text-ink-4 truncate">{bDomain}</span>
                  </div>
                  <p className="text-sm font-medium text-ink-1 line-clamp-2
                                leading-snug mb-1.5">
                    {b.title || bDomain}
                  </p>
                  {b.description && (
                    <p className="text-[11px] text-ink-4 line-clamp-2 leading-relaxed">
                      {b.description}
                    </p>
                  )}
                  {b.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {b.tags.slice(0, 3).map((t: any) => (
                        <span key={t.id}
                              className="text-[9px] px-1.5 py-0.5 bg-brand/10
                                         text-brand-bright rounded-full">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Left arrow */}
        {items.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); goPrev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6
                       bg-surface-2 border border-surface-4 rounded-full
                       flex items-center justify-center text-ink-3
                       hover:text-ink-1 hover:bg-surface-3 transition-colors
                       shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {items.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); goNext() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6
                       bg-surface-2 border border-surface-4 rounded-full
                       flex items-center justify-center text-ink-3
                       hover:text-ink-1 hover:bg-surface-3 transition-colors
                       shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
