import { useState } from 'react'
import { feedbackApi } from '../lib/api'

type Category = 'bug' | 'feature' | 'general' | 'other'

export function FeedbackPage() {
  const [category, setCategory] = useState<Category>('general')
  const [email,    setEmail]    = useState('')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit() {
    if (message.trim().length < 5) {
      setError('Please write a bit more detail')
      return
    }
    setError('')
    setSending(true)
    const r = await feedbackApi.submit({
      email:    email.trim() || undefined,
      category,
      message:  message.trim(),
    })
    setSending(false)
    if (r.error) {
      setError('Something went wrong — please try again')
    } else {
      setSent(true)
    }
  }

  const categories: { key: Category; label: string; emoji: string }[] = [
    { key: 'bug',     label: 'Bug report',      emoji: '🐛' },
    { key: 'feature', label: 'Feature request', emoji: '💡' },
    { key: 'general', label: 'General feedback', emoji: '💬' },
    { key: 'other',   label: 'Something else',  emoji: '✨' },
  ]

  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">M</div>
          <span className="font-semibold text-ink-1 text-sm">Memex</span>
          <span className="text-ink-5 text-xs">/</span>
          <span className="text-xs text-ink-3">Feedback</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/help"    className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Help</a>
          <a href="/about"   className="text-xs text-ink-3 hover:text-ink-1 transition-colors">About</a>
          <a href="/explore" className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Explore</a>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-16">

        {sent ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">🎉</p>
            <h1 className="text-xl font-bold text-ink-1 mb-2">Thank you!</h1>
            <p className="text-sm text-ink-3 mb-6">
              Your feedback has been received. We read every message.
            </p>
            <a href="/"
               className="inline-block px-4 py-2 bg-brand text-white text-xs
                          font-medium rounded-xl hover:bg-brand/90 transition-colors">
              Back to Memex
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ink-1 mb-2">Send feedback</h1>
              <p className="text-sm text-ink-3">
                Found a bug? Have an idea? Let us know — we read everything.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl
                                  border text-xs font-medium transition-colors
                                  ${category === cat.key
                                    ? 'border-brand/40 bg-brand/10 text-brand-bright'
                                    : 'border-surface-4 bg-surface-2 text-ink-3 hover:text-ink-1'}`}
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Tell us what's on your mind..."
                  className="w-full px-3 py-2.5 bg-surface-2 border border-surface-4
                             rounded-xl text-sm text-ink-1 outline-none resize-none
                             focus:border-brand transition-colors placeholder-ink-5"
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-2">
                  Email <span className="normal-case font-normal text-ink-5">(optional, if you'd like a reply)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-surface-2 border border-surface-4
                             rounded-xl text-sm text-ink-1 outline-none
                             focus:border-brand transition-colors placeholder-ink-5"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full py-3 bg-brand text-white text-sm font-medium
                           rounded-xl hover:bg-brand/90 disabled:opacity-40
                           transition-colors"
              >
                {sending ? 'Sending...' : 'Send feedback'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
