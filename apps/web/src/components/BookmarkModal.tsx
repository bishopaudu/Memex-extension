import { useEffect, useRef, useState } from 'react'

interface Attachment {
  id:        string
  type:      string
  content:   string | null
  url:       string | null
  label:     string | null
  createdAt: string
}

interface Tag   { id: string; name: string }

interface Bookmark {
  id:            string
  url:           string
  title:         string | null
  description:   string | null
  screenshotUrl: string | null
  faviconUrl:    string | null
  ogImageUrl:    string | null
  tags:          Tag[]
  attachments?:  Attachment[]
  createdAt:     string
}

interface Props {
  bookmark:   Bookmark
  onClose:    () => void
  onDelete:   (id: string) => void
  onTagClick: (tag: string) => void
}

type Tab = 'overview' | 'screenshots' | 'notes'

export function BookmarkModal({ bookmark, onClose, onDelete, onTagClick }: Props) {
  const overlayRef             = useRef<HTMLDivElement>(null)
  const [tab,        setTab]   = useState<Tab>('overview')
  const [lightbox,   setLightbox] = useState<string | null>(null)
  const [copied,     setCopied]   = useState(false)

  const allAtts    = bookmark.attachments ?? []
  const imageAtts  = allAtts.filter(
    a => a.type === 'screenshot' || a.type === 'area_screenshot' || a.type === 'image'
  )
  const textAtts   = allAtts.filter(a => a.type === 'text')

  let domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

  const heroImage = bookmark.screenshotUrl ?? bookmark.ogImageUrl

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(bookmark.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ── MODAL OVERLAY ── */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] bg-surface-2
                     border border-surface-4 rounded-2xl overflow-hidden
                     flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* ── HERO ── */}
          <div className="relative w-full h-40 bg-surface-3 flex-shrink-0 overflow-hidden">
            {heroImage ? (
              <img
                src={heroImage}
                alt=""
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightbox(heroImage)}
                onError={e => {
                  e.currentTarget.parentElement!.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-10 h-10 text-surface-5" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-2/80 to-transparent" />

            {/* Attachment count badge */}
            {allAtts.length > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5
                              px-2.5 py-1 rounded-full text-xs font-medium
                              bg-black/60 text-white backdrop-blur-sm">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19
                           a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
                {allAtts.length} attachment{allAtts.length > 1 ? 's' : ''}
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center
                         rounded-full bg-black/60 text-white backdrop-blur-sm
                         hover:bg-black/80 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* ── HEADER INFO ── */}
          <div className="px-5 pt-4 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              {bookmark.faviconUrl && (
                <img src={bookmark.faviconUrl} alt="" className="w-3.5 h-3.5"
                     onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <span className="text-[11px] text-ink-3">{domain}</span>
              <span className="text-ink-5">·</span>
              <span className="text-[11px] text-ink-4">{formatDate(bookmark.createdAt)}</span>
            </div>

            <h2 className="text-sm font-semibold text-ink-1 leading-snug mb-2">
              {bookmark.title ?? domain}
            </h2>

            {bookmark.description && (
              <p className="text-xs text-ink-3 leading-relaxed mb-3">
                {bookmark.description}
              </p>
            )}

            {/* Tags */}
            {bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {bookmark.tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => { onTagClick(tag.name); onClose() }}
                    className="px-2 py-0.5 bg-brand/10 text-brand-bright text-[11px]
                               rounded-full hover:bg-brand/20 transition-colors"
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── TABS ── */}
          <div className="flex border-t border-b border-surface-4 flex-shrink-0 mx-0">
            {(
              [
                { key: 'overview',     label: 'Overview',     count: null },
                { key: 'screenshots',  label: 'Screenshots',  count: imageAtts.length },
                { key: 'notes',        label: 'Notes',        count: textAtts.length },
              ] as const
            ).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5
                            text-xs transition-colors relative
                            ${tab === t.key
                              ? 'text-brand-bright bg-brand/5'
                              : 'text-ink-3 hover:text-ink-2 hover:bg-surface-3'}`}
              >
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full
                                   ${tab === t.key
                                     ? 'bg-brand/20 text-brand-bright'
                                     : 'bg-surface-4 text-ink-4'}`}>
                    {t.count}
                  </span>
                )}
                {tab === t.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                )}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="flex-1 overflow-y-auto">

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="p-5 flex flex-col gap-4">

                {/* Quick attachment preview */}
                {allAtts.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium text-ink-4 uppercase
                                  tracking-wider mb-2">Attachments</p>
                    <div className="grid grid-cols-4 gap-2">
                      {imageAtts.slice(0, 3).map(att => (
                        <div
                          key={att.id}
                          onClick={() => att.url && setLightbox(att.url)}
                          className="aspect-square bg-surface-3 rounded-lg
                                     border border-surface-4 overflow-hidden
                                     cursor-zoom-in hover:border-brand/40
                                     transition-colors relative group"
                        >
                          {att.url && (
                            <img src={att.url} alt=""
                                 className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/0
                                          group-hover:bg-black/20 transition-colors
                                          flex items-center justify-center">
                            <svg className="w-4 h-4 text-white opacity-0
                                            group-hover:opacity-100 transition-opacity"
                                 fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor" strokeWidth={2}>
                              <circle cx="11" cy="11" r="8"/>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              <line x1="11" y1="8" x2="11" y2="14"/>
                              <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                          </div>
                          <span className="absolute top-1 left-1 text-[8px]">
                            {att.type === 'area_screenshot' ? '✂️' : '📸'}
                          </span>
                        </div>
                      ))}

                      {/* Text note thumbnails */}
                      {textAtts.slice(0, 4 - Math.min(imageAtts.length, 3)).map(att => (
                        <div
                          key={att.id}
                          onClick={() => setTab('notes')}
                          className="aspect-square bg-brand/5 border border-brand/20
                                     rounded-lg flex flex-col items-center justify-center
                                     gap-1 cursor-pointer hover:bg-brand/10
                                     transition-colors p-2"
                        >
                          <span className="text-lg">📝</span>
                          <p className="text-[9px] text-ink-4 text-center line-clamp-2 leading-tight">
                            {att.content?.slice(0, 20)}...
                          </p>
                        </div>
                      ))}

                      {/* "View all" cell if more than 4 */}
                      {allAtts.length > 4 && (
                        <div
                          onClick={() => setTab(imageAtts.length > 0 ? 'screenshots' : 'notes')}
                          className="aspect-square bg-surface-3 border border-surface-4
                                     rounded-lg flex flex-col items-center justify-center
                                     gap-1 cursor-pointer hover:bg-surface-4
                                     transition-colors"
                        >
                          <span className="text-sm font-semibold text-ink-2">
                            +{allAtts.length - 3}
                          </span>
                          <span className="text-[9px] text-ink-4">more</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8
                                  text-center border border-dashed border-surface-5
                                  rounded-xl">
                    <span className="text-2xl mb-2">📎</span>
                    <p className="text-xs text-ink-3 mb-1">No attachments yet</p>
                    <p className="text-[10px] text-ink-4">
                      Use the extension to add screenshots or notes
                    </p>
                  </div>
                )}

                {/* URL preview */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-3
                                border border-surface-4 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-ink-4 flex-shrink-0" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07
                             l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07
                             l1.71-1.71"/>
                  </svg>
                  <p className="text-[11px] text-ink-3 truncate flex-1">
                    {bookmark.url}
                  </p>
                </div>
              </div>
            )}

            {/* SCREENSHOTS TAB */}
            {tab === 'screenshots' && (
              <div className="p-5">
                {imageAtts.length === 0 ? (
                  <EmptyTab
                    emoji="📸"
                    title="No screenshots"
                    subtitle="Use the extension to capture a screenshot or select an area"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {imageAtts.map((att, i) => (
                      <div key={att.id}
                           className="group relative bg-surface-3 rounded-xl
                                      border border-surface-4 overflow-hidden">
                        {/* Type label bar */}
                        <div className="flex items-center gap-2 px-3 py-2
                                        border-b border-surface-4">
                          <span className="text-sm">
                            {att.type === 'area_screenshot' ? '✂️' : '📸'}
                          </span>
                          <span className="text-[11px] font-medium text-ink-2">
                            {att.type === 'area_screenshot'
                              ? 'Area selection'
                              : att.type === 'screenshot'
                                ? 'Full screenshot'
                                : 'Image'}
                          </span>
                          {att.label && (
                            <span className="text-[10px] text-ink-4 ml-1">
                              — {att.label}
                            </span>
                          )}
                          <span className="ml-auto text-[10px] text-ink-4">
                            #{i + 1}
                          </span>
                        </div>

                        {/* Image */}
                        {att.url ? (
                          <div
                            className="cursor-zoom-in relative"
                            onClick={() => setLightbox(att.url!)}
                          >
                            <img
                              src={att.url}
                              alt=""
                              className="w-full object-cover max-h-56
                                         group-hover:opacity-95 transition-opacity"
                            />
                            {/* Zoom hint */}
                            <div className="absolute inset-0 flex items-center
                                            justify-center opacity-0
                                            group-hover:opacity-100 transition-opacity">
                              <div className="bg-black/60 backdrop-blur-sm text-white
                                              text-xs px-3 py-1.5 rounded-full
                                              flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                     stroke="currentColor" strokeWidth={2}>
                                  <circle cx="11" cy="11" r="8"/>
                                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                  <line x1="11" y1="8" x2="11" y2="14"/>
                                  <line x1="8" y1="11" x2="14" y2="11"/>
                                </svg>
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 flex items-center justify-center
                                          text-xs text-ink-4">
                            No image available
                          </div>
                        )}

                        {/* Open full size link */}
                        {att.url && (
                          <div className="flex items-center justify-end px-3 py-2
                                          border-t border-surface-4">
                            
                             <a href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-ink-3
                                         hover:text-brand-bright transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              Open full size
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                   stroke="currentColor" strokeWidth={2}>
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8
                                         a2 2 0 012-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {tab === 'notes' && (
              <div className="p-5">
                {textAtts.length === 0 ? (
                  <EmptyTab
                    emoji="📝"
                    title="No notes"
                    subtitle="Use the extension to add text notes to this bookmark"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {textAtts.map((att, i) => (
                      <NoteCard key={att.id} att={att} index={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ACTION BAR ── */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-4
                          flex-shrink-0 bg-surface-2">
            
            <a  href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white
                         text-xs font-medium rounded-lg hover:bg-brand/90
                         transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open page
            </a>

            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-3
                         border border-surface-4 text-ink-2 text-xs rounded-lg
                         hover:bg-surface-4 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-green-400" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy URL
                </>
              )}
            </button>

            <button
              onClick={() => { onDelete(bookmark.id); onClose() }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-ink-3
                         text-xs rounded-lg hover:bg-red-500/10 hover:text-red-400
                         transition-colors border border-surface-4"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
                       rounded-full bg-white/10 text-white hover:bg-white/20
                       transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* ESC hint */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs
                        text-white/40">
            Press Esc or click to close
          </p>

          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// Note card with copy button
// ─────────────────────────────────────────────
function NoteCard({ att, index }: { att: any; index: number }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(att.content ?? '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative bg-surface-3 border border-surface-4
                    rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-4">
        <span className="text-sm">📝</span>
        <span className="text-[11px] font-medium text-ink-2">Note {index}</span>
        {att.label && (
          <span className="text-[10px] text-ink-4">— {att.label}</span>
        )}

        {/* Copy button — appears on hover */}
        <button
          onClick={copy}
          className="ml-auto flex items-center gap-1 text-[10px] text-ink-4
                     hover:text-ink-2 transition-colors opacity-0
                     group-hover:opacity-100"
        >
          {copied ? (
            <span className="text-green-400">Copied ✓</span>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content — left accent border */}
      <div className="flex">
        <div className="w-0.5 bg-brand flex-shrink-0" />
        <p className="flex-1 px-4 py-3 text-sm text-ink-1 leading-relaxed
                      whitespace-pre-wrap">
          {att.content}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Empty state for tabs
// ─────────────────────────────────────────────
function EmptyTab({ emoji, title, subtitle }: {
  emoji:    string
  title:    string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center
                    border border-dashed border-surface-5 rounded-xl">
      <span className="text-3xl mb-3">{emoji}</span>
      <p className="text-sm font-medium text-ink-2 mb-1">{title}</p>
      <p className="text-xs text-ink-4 max-w-xs">{subtitle}</p>
    </div>
  )
}
