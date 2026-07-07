import { useState, useEffect } from 'react'

const STORAGE_KEY = 'memex_getting_started'

interface Step {
  id:       string
  emoji:    string
  title:    string
  desc:     string
  action:   string
  actionUrl?: string
  onClick?: () => void
  done:     boolean
}

interface Props {
  bookmarkCount:   number
  topicCount:      number
  collectionCount: number
  hasExtension:    boolean
  onOpenWiki:      () => void
  onOpenCollections: () => void
}

export function GettingStarted({
  bookmarkCount,
  topicCount,
  collectionCount,
  hasExtension,
  onOpenWiki,
  onOpenCollections,
}: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'dismissed') {
      setDismissed(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'dismissed')
    setDismissed(false)
  }

  const steps: Step[] = [
    {
      id:      'extension',
      emoji:   '🧩',
      title:   'Install the browser extension',
      desc:    'Save anything from the web with one click. Available on Firefox and Chrome.',
      action:  hasExtension ? 'Installed ✓' : 'Install extension',
      actionUrl: 'https://addons.mozilla.org/firefox/addon/memex-visual-bookmarks',
      done:    hasExtension || bookmarkCount > 0,
    },
    {
      id:      'bookmark',
      emoji:   '🔖',
      title:   'Save your first bookmark',
      desc:    'Click the Memex icon on any webpage to save it with tags and screenshots.',
      action:  bookmarkCount > 0 ? `${bookmarkCount} saved ✓` : 'Open extension',
      done:    bookmarkCount > 0,
    },
    {
      id:      'collection',
      emoji:   '📁',
      title:   'Create a collection',
      desc:    'Group related bookmarks into collections — like folders, but visual and shareable.',
      action:  collectionCount > 0 ? `${collectionCount} created ✓` : 'Create collection',
      onClick: onOpenCollections,
      done:    collectionCount > 0,
    },
    {
      id:      'wiki',
      emoji:   '🧠',
      title:   'Build your first wiki topic',
      desc:    'Connect your bookmarks into a knowledge graph. Link ideas, build your second brain.',
      action:  topicCount > 0 ? `${topicCount} topics ✓` : 'Open wiki',
      onClick: onOpenWiki,
      done:    topicCount > 0,
    },
    {
      id:      'share',
      emoji:   '🌍',
      title:   'Share your knowledge',
      desc:    'Make any bookmark, collection, or topic public. Others can discover it on /explore.',
      action:  'View explore',
      actionUrl: '/explore',
      done:    false,
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone        = completedCount === steps.length
  const progress       = Math.round((completedCount / steps.length) * 100)

  if (dismissed) return null

  return (
    <div className="mb-8 bg-surface-2 border border-surface-4 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-1 flex items-center gap-2">
            {allDone ? '🎉' : '👋'} Getting started with Memex
          </h2>
          <p className="text-[11px] text-ink-4 mt-0.5">
            {allDone
              ? "You're all set! You've explored everything Memex has to offer."
              : `${completedCount} of ${steps.length} steps complete`}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-[10px] text-ink-4 hover:text-ink-2 transition-colors
                     px-2 py-1 rounded-lg hover:bg-surface-3"
        >
          {allDone ? 'Dismiss' : 'Skip for now'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-3">
        <div
          className="h-full bg-brand transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-surface-4">
        {steps.map(step => (
          <div
            key={step.id}
            className={`flex items-center gap-4 px-5 py-3.5 transition-colors
                        ${step.done ? 'opacity-60' : 'hover:bg-surface-3'}`}
          >
            {/* Check / emoji */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
                             flex-shrink-0 text-base transition-all
                             ${step.done
                               ? 'bg-green-500/20 border border-green-500/30'
                               : 'bg-surface-3 border border-surface-4'}`}>
              {step.done ? (
                <svg className="w-4 h-4 text-green-400" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                <span>{step.emoji}</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${step.done ? 'text-ink-3 line-through' : 'text-ink-1'}`}>
                {step.title}
              </p>
              <p className="text-[10px] text-ink-4 mt-0.5 leading-relaxed">
                {step.desc}
              </p>
            </div>

            {/* Action button */}
            {!step.done && (
              step.actionUrl ? (
                
                  <a href={step.actionUrl}
                  target={step.actionUrl.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium
                             bg-brand/10 text-brand-bright border border-brand/20
                             rounded-lg hover:bg-brand/20 transition-colors whitespace-nowrap"
                >
                  {step.action}
                </a>
              ) : (
                <button
                  onClick={step.onClick}
                  className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium
                             bg-brand/10 text-brand-bright border border-brand/20
                             rounded-lg hover:bg-brand/20 transition-colors whitespace-nowrap"
                >
                  {step.action}
                </button>
              )
            )}

            {step.done && (
              <span className="flex-shrink-0 text-[10px] text-green-400 whitespace-nowrap">
                {step.action}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
