import { useState, useEffect } from 'react'
import { bookmarksApi } from '../lib/api'

interface Attachment {
  id:        string
  type:      string
  content:   string | null
  url:       string | null
  label:     string | null
  createdAt: string
}

interface Tag { id: string; name: string }

interface Bookmark {
  id:            string
  url:           string
  title:         string | null
  description:   string | null
  screenshotUrl: string | null
  faviconUrl:    string | null
  ogImageUrl:    string | null
  tags:          Tag[]
  attachments:   Attachment[]
  createdAt:     string
  updatedAt:     string
}

type Tab = 'overview' | 'screenshots' | 'images' | 'notes' | 'links'

interface Props {
  bookmarkId: string
  onBack:     () => void
  onDelete:   (id: string) => void
  onTagClick: (tag: string) => void
}

export function BookmarkDetailPage({ bookmarkId, onBack, onDelete, onTagClick }: Props) {
  const [bookmark,  setBookmark]  = useState<Bookmark | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<Tab>('overview')
  const [lightbox,  setLightbox]  = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)

  useEffect(() => { fetchBookmark() }, [bookmarkId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else onBack()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, onBack])

  async function fetchBookmark() {
    setLoading(true)
    const r = await bookmarksApi.getOne(bookmarkId)
    if (!r.error) setBookmark(r.data.bookmark)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (!bookmark) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <p className="text-sm text-ink-2 mb-2">Bookmark not found</p>
          <button onClick={onBack} className="text-xs text-brand-bright hover:underline">
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // Categorise attachments
  const atts        = bookmark.attachments ?? []
  const screenshots = atts.filter(a =>
    a.type === 'screenshot' || a.type === 'area_screenshot')
  const textNotes   = atts.filter(a => a.type === 'text' && !isExtraction(a.content))
  const extracted   = atts.filter(a => a.type === 'text' && isExtraction(a.content))
  const imgExtract  = extracted.filter(a => a.content?.startsWith('🖼️'))
  const linkExtract = extracted.filter(a => a.content?.startsWith('🔗'))
  const textExtract = extracted.filter(a => a.content?.startsWith('📝'))

  // Parse extracted images
  const extractedImages = parseImages(imgExtract)
  const extractedLinks  = parseLinks(linkExtract)

  // Hero image
  const heroImage = bookmark.screenshotUrl ?? bookmark.ogImageUrl

  let domain = ''
  try { domain = new URL(bookmark.url).hostname.replace('www.', '') } catch {}

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(bookmark!.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

 /* const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'overview',    label: 'Overview',    count: 0 },
    { key: 'screenshots', label: 'Screenshots', count: screenshots.length },
    { key: 'images',      label: 'Images',      count: extractedImages.length },
    { key: 'notes',       label: 'Notes',       count: textNotes.length + textExtract.length },
    { key: 'links',       label: 'Links',       count: extractedLinks.length },
  ].filter(t => t.key === 'overview' || t.count > 0)*/
  const allTabs: { key: Tab; label: string; count: number }[] = [
  { key: 'overview',    label: 'Overview',    count: 0 },
  { key: 'screenshots', label: 'Screenshots', count: screenshots.length },
  { key: 'images',      label: 'Images',      count: extractedImages.length },
  { key: 'notes',       label: 'Notes',       count: textNotes.length + textExtract.length },
  { key: 'links',       label: 'Links',       count: extractedLinks.length },
]

const tabs = allTabs.filter(
  t => t.key === 'overview' || t.count > 0
)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">

      {/* ── TOP BAR ── */}
      <header className="h-12 border-b border-surface-4 flex items-center
                         gap-3 px-5 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-ink-3
                     hover:text-ink-1 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        <span className="text-ink-5 text-xs">/</span>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {bookmark.faviconUrl && (
            <img src={bookmark.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
                 onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <span className="text-xs font-medium text-ink-1 truncate">
            {bookmark.title ?? domain}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white
                        text-xs font-medium rounded-lg hover:bg-brand/90 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open
          </a>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-3
                       border border-surface-4 text-xs text-ink-2 rounded-lg
                       hover:bg-surface-4 transition-colors"
          >
            {copied ? (
              <span className="text-green-400">Copied!</span>
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
            onClick={() => { onDelete(bookmark.id); onBack() }}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-ink-4 hover:text-red-400 hover:bg-red-400/10
                       transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* ── HERO ── */}
        <div className="relative w-full bg-surface-3 overflow-hidden"
             style={{ height: heroImage ? 280 : 0 }}>
          {heroImage && (
            <>
              {/* Blurred background */}
              <div className="absolute inset-0"
                   style={{
                     backgroundImage:    `url(${heroImage})`,
                     backgroundSize:     'cover',
                     backgroundPosition: 'center',
                     filter:             'blur(20px) brightness(0.4)',
                     transform:          'scale(1.1)',
                   }} />

              {/* Actual screenshot centered */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={heroImage}
                  alt=""
                  className="max-h-full max-w-full object-contain rounded-xl
                             shadow-2xl cursor-zoom-in"
                  onClick={() => setLightbox(heroImage)}
                />
              </div>

              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20"
                   style={{ background: 'linear-gradient(transparent, var(--s1))' }} />
            </>
          )}
        </div>

        {/* ── BOOKMARK INFO ── */}
        <div className="px-8 py-6 border-b border-surface-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2 text-xs text-ink-4">
              {bookmark.faviconUrl && (
                <img src={bookmark.faviconUrl} alt="" className="w-4 h-4"
                     onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <span>{domain}</span>
              <span className="text-ink-5">·</span>
              <span>{formatDate(bookmark.createdAt)}</span>
            </div>

            <h1 className="text-xl font-bold text-ink-1 leading-snug mb-3">
              {bookmark.title ?? domain}
            </h1>

            {bookmark.description && (
              <p className="text-sm text-ink-3 leading-relaxed mb-4 max-w-2xl">
                {bookmark.description}
              </p>
            )}

            {/* Tags */}
            {bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bookmark.tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => { onTagClick(tag.name); onBack() }}
                    className="px-2.5 py-1 bg-brand/10 text-brand-bright text-xs
                               rounded-full hover:bg-brand/20 transition-colors
                               border border-brand/20"
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        {tabs.length > 1 && (
          <div className="flex border-b border-surface-4 px-8">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium
                            relative transition-colors
                            ${tab === t.key
                              ? 'text-brand-bright'
                              : 'text-ink-3 hover:text-ink-2'}`}
              >
                {t.label}
                {t.count > 0 && (
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
        )}

        {/* ── TAB CONTENT ── */}
        <div className="px-8 py-6">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="max-w-3xl space-y-6">

              {/* Attachment summary */}
              {atts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-ink-3 uppercase
                                 tracking-wider mb-3">
                    Attachments ({atts.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.map(att => (
                      <div
                        key={att.id}
                        onClick={() => att.url && setLightbox(att.url)}
                        className="group relative aspect-video bg-surface-3
                                   rounded-xl overflow-hidden border border-surface-4
                                   cursor-zoom-in hover:border-brand/30 transition-colors"
                      >
                        {att.url && (
                          <img src={att.url} alt=""
                               className="w-full h-full object-cover
                                          group-hover:scale-105 transition-transform" />
                        )}
                        <div className="absolute inset-0 bg-black/0
                                        group-hover:bg-black/20 transition-colors
                                        flex items-center justify-center">
                          <svg className="w-5 h-5 text-white opacity-0
                                          group-hover:opacity-100 transition-opacity"
                               fill="none" viewBox="0 0 24 24"
                               stroke="currentColor" strokeWidth={2}>
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="11" y1="8" x2="11" y2="14"/>
                            <line x1="8"  y1="11" x2="14" y2="11"/>
                          </svg>
                        </div>
                        <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5
                                         bg-black/60 text-white rounded-full">
                          {att.type === 'area_screenshot' ? '✂️ Area' : '📸 Screenshot'}
                        </span>
                      </div>
                    ))}

                    {/* Text notes preview */}
                    {textNotes.slice(0, 2).map(att => (
                      <div key={att.id}
                           className="aspect-video bg-brand/5 border border-brand/20
                                      rounded-xl p-3 flex flex-col justify-between
                                      cursor-pointer hover:bg-brand/10 transition-colors"
                           onClick={() => setTab('notes')}>
                        <span className="text-xl">📝</span>
                        <p className="text-[10px] text-ink-3 line-clamp-3 leading-relaxed">
                          {att.content?.slice(0, 100)}
                        </p>
                      </div>
                    ))}

                    {/* Extracted images count */}
                    {extractedImages.length > 0 && (
                      <div className="aspect-video bg-green-500/5 border border-green-500/20
                                      rounded-xl p-3 flex flex-col items-center justify-center
                                      gap-2 cursor-pointer hover:bg-green-500/10 transition-colors"
                           onClick={() => setTab('images')}>
                        <span className="text-2xl">🖼️</span>
                        <p className="text-[10px] text-ink-3 text-center">
                          {extractedImages.length} images extracted
                        </p>
                        <p className="text-[9px] text-ink-4">Click to view →</p>
                      </div>
                    )}

                    {/* Extracted links count */}
                    {extractedLinks.length > 0 && (
                      <div className="aspect-video bg-amber-500/5 border border-amber-500/20
                                      rounded-xl p-3 flex flex-col items-center justify-center
                                      gap-2 cursor-pointer hover:bg-amber-500/10 transition-colors"
                           onClick={() => setTab('links')}>
                        <span className="text-2xl">🔗</span>
                        <p className="text-[10px] text-ink-3 text-center">
                          {extractedLinks.length} links extracted
                        </p>
                        <p className="text-[9px] text-ink-4">Click to view →</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No attachments */}
              {atts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center
                                border border-dashed border-surface-5 rounded-2xl">
                  <span className="text-4xl mb-3">📎</span>
                  <p className="text-sm font-medium text-ink-2 mb-1">No attachments</p>
                  <p className="text-xs text-ink-4 max-w-xs">
                    Use the Memex extension to add screenshots, notes, or extracted content
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SCREENSHOTS */}
          {tab === 'screenshots' && (
            <div className="max-w-4xl">
              {screenshots.length === 0 ? (
                <EmptyState emoji="📸" title="No screenshots"
                            subtitle="Capture screenshots using the extension" />
              ) : (
                <div className="flex flex-col gap-6">
                  {screenshots.map((att, i) => (
                    <div key={att.id}
                         className="bg-surface-2 border border-surface-4 rounded-2xl
                                    overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3
                                      border-b border-surface-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {att.type === 'area_screenshot' ? '✂️' : '📸'}
                          </span>
                          <span className="text-xs font-medium text-ink-2">
                            {att.type === 'area_screenshot'
                              ? 'Area selection' : 'Full screenshot'}
                          </span>
                          <span className="text-[10px] text-ink-4">#{i + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {att.url && (
                            <>
                              
                               <a href={att.url}
                                download={`screenshot-${i + 1}.png`}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px]
                                           text-ink-3 hover:text-ink-1 bg-surface-3
                                           border border-surface-4 rounded-lg transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                     stroke="currentColor" strokeWidth={2}>
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Download
                              </a>
                              <button
                                onClick={() => setLightbox(att.url!)}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px]
                                           text-ink-3 hover:text-brand-bright bg-surface-3
                                           border border-surface-4 rounded-lg transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                     stroke="currentColor" strokeWidth={2}>
                                  <circle cx="11" cy="11" r="8"/>
                                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                Full size
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Image */}
                      {att.url ? (
                        <div
                          className="group relative cursor-zoom-in bg-surface-3"
                          onClick={() => setLightbox(att.url!)}
                        >
                          <img src={att.url} alt=""
                               className="w-full object-contain max-h-96" />
                          <div className="absolute inset-0 bg-black/0
                                          group-hover:bg-black/10 transition-colors
                                          flex items-center justify-center">
                            <div className="bg-black/50 text-white text-xs px-3 py-1.5
                                            rounded-full opacity-0 group-hover:opacity-100
                                            transition-opacity backdrop-blur-sm">
                              Click to enlarge
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 flex items-center justify-center text-ink-4 text-xs">
                          Image not available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* IMAGES */}
          {tab === 'images' && (
            <div className="max-w-4xl">
              {extractedImages.length === 0 ? (
                <EmptyState emoji="🖼️" title="No extracted images"
                            subtitle="Use the Extract button in the extension to extract images" />
              ) : (
                <>
                  <p className="text-xs text-ink-4 mb-4">
                    {extractedImages.length} images extracted from this page
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {extractedImages.map((img, i) => (
                      <ImageCard
                        key={i}
                        img={img}
                        onLightbox={() => setLightbox(img.src)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <div className="max-w-2xl space-y-3">
              {textNotes.length === 0 && textExtract.length === 0 ? (
                <EmptyState emoji="📝" title="No notes"
                            subtitle="Add text notes using the extension" />
              ) : (
                <>
                  {[...textNotes, ...textExtract].map((att, i) => (
                    <FullNoteCard key={att.id} att={att} index={i + 1} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* LINKS */}
          {tab === 'links' && (
            <div className="max-w-3xl">
              {extractedLinks.length === 0 ? (
                <EmptyState emoji="🔗" title="No extracted links"
                            subtitle="Use the Extract button in the extension to extract links" />
              ) : (
                <LinksView links={extractedLinks} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center
                       rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6"  y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          
           <a href={lightbox}
            download
            className="absolute top-4 right-16 w-10 h-10 flex items-center
                       justify-center rounded-full bg-white/10 text-white
                       hover:bg-white/20 transition-colors"
            onClick={e => e.stopPropagation()}
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>

          <p className="absolute bottom-4 text-white/30 text-xs">
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
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers — parse extracted content
// ─────────────────────────────────────────────
function isExtraction(content: string | null): boolean {
  if (!content) return false
  return content.startsWith('📝 Article text') ||
         content.startsWith('🖼️ Images extracted') ||
         content.startsWith('🔗 Links extracted')
}

function parseImages(atts: Attachment[]): {
  src: string; alt: string; width: string; height: string
}[] {
  const images: { src: string; alt: string; width: string; height: string }[] = []
  const seen = new Set<string>()

  atts.forEach(att => {
    if (!att.content) return
    const lines = att.content.split('\n')

    let currentAlt = ''

    lines.forEach(line => {
      const trimmed = line.trim()

      // Line like: "1. Image alt text"
      const numbered = trimmed.match(/^\d+\.\s+(.+)/)
      if (numbered) {
        currentAlt = numbered[1]
          .replace(/\s*\(\d+×\d+\).*$/, '') // strip dimensions
          .trim()
        return
      }

      // Line that is (or contains) a URL
      const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/)
      if (urlMatch) {
        let src = urlMatch[0]

        // Clean up — remove trailing dimensions like "(800×600)"
        src = src.replace(/\(\d+×\d+\)$/, '').trim()

        // Skip duplicates and non-image URLs
        if (seen.has(src)) return
        if (!src.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp|tiff)(\?.*)?$/i)) {
          // Allow URLs without extension if they look like image CDNs
          const imageHosts = ['images.', 'img.', 'cdn.', 'media.',
                              'photos.', 'cloudinary', 'imgix', 'unsplash']
          const isImageHost = imageHosts.some(h =>
            src.toLowerCase().includes(h)
          )
          if (!isImageHost) { currentAlt = ''; return }
        }

        // Extract dimensions if present after the URL
        const dimMatch = trimmed.match(/\((\d+)×(\d+)\)/)

        seen.add(src)
        images.push({
          src,
          alt:    currentAlt,
          width:  dimMatch?.[1] ?? '',
          height: dimMatch?.[2] ?? '',
        })
        currentAlt = ''
      }
    })
  })

  return images.filter(img => img.src.startsWith('http'))
}

function parseLinks(atts: Attachment[]): {
  text: string; url: string; isExternal: boolean
}[] {
  const links: { text: string; url: string; isExternal: boolean }[] = []
  atts.forEach(att => {
    if (!att.content) return
    const lines = att.content.split('\n')
    let currentText = ''
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('•')) {
        currentText = trimmed.slice(1).trim()
      } else if (trimmed.startsWith('http') && currentText) {
        links.push({
          text:       currentText,
          url:        trimmed,
          isExternal: !trimmed.includes(window?.location?.hostname ?? 'x'),
        })
        currentText = ''
      }
    })
  })
  return links
}

// ─────────────────────────────────────────────
// Image Card
// ─────────────────────────────────────────────
function ImageCard({ img, onLightbox }: {
  img:        { src: string; alt: string; width: string; height: string }
  onLightbox: () => void
}) {
  const [loaded,  setLoaded]  = useState(false)
  const [failed,  setFailed]  = useState(false)
  const [hovered, setHovered] = useState(false)

  if (failed) return null

  return (
    <div
      className="group relative bg-surface-3 rounded-xl overflow-hidden
                 border border-surface-4 hover:border-surface-5 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        className="aspect-square cursor-zoom-in relative overflow-hidden"
        onClick={onLightbox}
      >
        {!loaded && !failed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}
        <img
          src={img.src}
          alt={img.alt}
          className="w-full h-full object-cover transition-transform duration-300
                     group-hover:scale-105"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ opacity: loaded ? 1 : 0 }}
        />

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center
                         transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8"  y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 flex items-center justify-between">
        <p className="text-[9px] text-ink-4 truncate flex-1">
          {img.alt || new URL(img.src).hostname.replace('www.', '')}
        </p>
        
          <a href={img.src}
          download
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center
                     text-ink-4 hover:text-brand-bright transition-colors"
          onClick={e => e.stopPropagation()}
          title="Download image"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Links View
// ─────────────────────────────────────────────
function LinksView({ links }: { links: { text: string; url: string; isExternal: boolean }[] }) {
  const external = links.filter(l =>  l.isExternal)
  const internal = links.filter(l => !l.isExternal)
  const [filter, setFilter] = useState<'all' | 'external' | 'internal'>('all')
  const [search, setSearch] = useState('')

  const shown = links.filter(l => {
    if (filter === 'external' && !l.isExternal) return false
    if (filter === 'internal' &&  l.isExternal) return false
    if (search && !l.text.toLowerCase().includes(search.toLowerCase()) &&
        !l.url.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-lg overflow-hidden border border-surface-4">
          {([
            { key: 'all',      label: `All (${links.length})` },
            { key: 'external', label: `🌐 External (${external.length})` },
            { key: 'internal', label: `🏠 Internal (${internal.length})` },
          ] as const).map((f, i) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 text-[10px] transition-colors"
              style={{
                background: filter === f.key ? 'var(--brand)' : 'var(--s3)',
                color:      filter === f.key ? '#fff'         : 'var(--ink3)',
                borderLeft: i > 0 ? '0.5px solid var(--s4)' : undefined,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Filter links..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-3 border border-surface-4
                       rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                       focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Links table */}
      <div className="flex flex-col gap-1">
        {shown.map((link, i) => {
          let domain = ''
          try { domain = new URL(link.url).hostname.replace('www.', '') } catch {}

          return (
            
             <a key={i}
             href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                         bg-surface-2 border border-surface-4
                         hover:border-brand/30 hover:bg-surface-3 transition-all group"
            >
              {/* External/internal indicator */}
              <span className="text-sm flex-shrink-0">
                {link.isExternal ? '🌐' : '🏠'}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-1 truncate
                               group-hover:text-brand-bright transition-colors">
                  {link.text}
                </p>
                <p className="text-[10px] text-ink-4 truncate">{domain}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 opacity-0
                              group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-ink-4 max-w-32 truncate hidden sm:block">
                  {link.url}
                </span>
                <svg className="w-3.5 h-3.5 text-ink-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </div>
            </a>
          )
        })}

        {shown.length === 0 && (
          <div className="text-center py-8 text-xs text-ink-4">
            No links match your filter
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Full Note Card
// ─────────────────────────────────────────────
function FullNoteCard({ att, index }: { att: any; index: number }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const content   = att.content ?? ''
  const isLong    = content.length > 600
  const firstLine = content.split('\n')[0] ?? ''

  const accentColor =
    firstLine.startsWith('📝') ? '#4f6ef7' :
    firstLine.startsWith('🖼️') ? '#10b981' :
    firstLine.startsWith('🔗') ? '#f59e0b' : '#4f6ef7'

  const typeLabel =
    firstLine.startsWith('📝') ? 'Article text' :
    firstLine.startsWith('🖼️') ? 'Extracted images' :
    firstLine.startsWith('🔗') ? 'Extracted links' :
    `Note ${index}`

  async function copy() {
    await navigator.clipboard.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-2xl overflow-hidden">
      {/* Color bar */}
      <div className="h-0.5" style={{ background: accentColor }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-surface-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {firstLine.startsWith('📝') ? '📝' :
             firstLine.startsWith('🖼️') ? '🖼️' :
             firstLine.startsWith('🔗') ? '🔗' : '📝'}
          </span>
          <span className="text-xs font-medium text-ink-2">{typeLabel}</span>
          <span className="text-[10px] text-ink-4">#{index}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-ink-4 hover:text-ink-2 transition-colors"
            >
              {expanded ? '↑ Less' : '↓ More'}
            </button>
          )}
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[10px] text-ink-4
                       hover:text-ink-2 transition-colors"
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
      </div>

      {/* Content */}
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ background: accentColor + '40' }} />
        <div className="flex-1 px-4 py-4 min-w-0">
          <p className="text-sm text-ink-1 leading-relaxed whitespace-pre-wrap break-words">
            {isLong && !expanded
              ? content.slice(0, 600) + '...'
              : content}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyState({ emoji, title, subtitle }: {
  emoji: string; title: string; subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center
                    border border-dashed border-surface-5 rounded-2xl">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="text-sm font-medium text-ink-2 mb-1">{title}</p>
      <p className="text-xs text-ink-4 max-w-xs">{subtitle}</p>
    </div>
  )
}
