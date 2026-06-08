import { useState, useEffect } from 'react'
import { bookmarksApi } from '../lib/api'

interface Props {
  onOpenBookmark: (id: string) => void
}

export function DailyRediscovery({ onOpenBookmark }: Props) {
  const [items,     setItems]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const today = new Date().toDateString()
    const lastShown = localStorage.getItem('memex_rediscovery_date')

    // Only fetch once per day
    if (lastShown === today) {
      const cached = localStorage.getItem('memex_rediscovery_items')
      if (cached) {
        setItems(JSON.parse(cached))
        setLoading(false)
        return
      }
    }

    fetchRediscovery(today)
  }, [])

  async function fetchRediscovery(today: string) {
    setLoading(true)
    // Fetch a larger set then randomly sample 5
    // Try page 1 first with higher limit, then sample randomly
    const r = await bookmarksApi.list({ limit: 50 } as any)
    if (!r.error && r.data.items.length >= 3) {
      const shuffled = [...r.data.items]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
      setItems(shuffled)
      localStorage.setItem('memex_rediscovery_date',  today)
      localStorage.setItem('memex_rediscovery_items', JSON.stringify(shuffled))
    }
    setLoading(false)
  }

  if (dismissed || loading || items.length === 0) return null

  return (
    <div className="mb-6 bg-surface-2 border border-surface-4 rounded-2xl
                    overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-surface-4">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <div>
            <p className="text-xs font-semibold text-ink-1">From your past</p>
            <p className="text-[10px] text-ink-4">
              Things you saved — worth revisiting today
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-ink-5 hover:text-ink-3 transition-colors text-sm"
        >
          ×
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col divide-y divide-surface-4">
        {items.map((b: any) => {
          let domain = ''
          try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}

          function timeAgo(date: string) {
            const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
            if (days < 7)   return `${days}d ago`
            if (days < 30)  return `${Math.floor(days / 7)}w ago`
            if (days < 365) return `${Math.floor(days / 30)}mo ago`
            return `${Math.floor(days / 365)}y ago`
          }

          return (
            <button
              key={b.id}
              onClick={() => onOpenBookmark(b.id)}
              className="flex items-center gap-3 px-4 py-2.5 text-left
                         hover:bg-surface-3 transition-colors group"
            >
              {b.faviconUrl && (
                <img src={b.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
                     onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-1 truncate group-hover:text-brand-bright
                               transition-colors">
                  {b.title ?? domain}
                </p>
                <p className="text-[10px] text-ink-4">{domain}</p>
              </div>
              <span className="text-[10px] text-ink-5 flex-shrink-0">
                {timeAgo(b.createdAt)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
