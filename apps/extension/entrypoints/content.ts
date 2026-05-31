export default defineContentScript({
  matches: ['<all_urls>'],

  main() {

    // ── Page metadata ──
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      if (message.type === 'GET_PAGE_METADATA') {
        sendResponse({
          title:       document.title,
          description: getMeta('description') ?? getMeta('og:description') ?? '',
          ogImageUrl:  getMeta('og:image') ?? '',
          faviconUrl:  getFavicon(),
          url:         window.location.href,
        })
        return true
      }

      // ── Area selector ──
      if (message.type === 'START_AREA_SELECT') {
        startAreaSelector()
          .then(region => sendResponse({ region }))
          .catch(() => sendResponse({ region: null }))
        return true
      }

      // ── Text highlight ──
      if (message.type === 'GET_SELECTED_TEXT') {
        const selection = window.getSelection()
        const text      = selection?.toString().trim() ?? ''
        const range     = selection?.getRangeAt(0)
        let context     = ''
        if (range) {
          const container = range.commonAncestorContainer
          const parent    = container.nodeType === 3
            ? container.parentElement
            : container as Element
          context = parent?.textContent?.slice(0, 300) ?? ''
        }
        sendResponse({ text, context, url: window.location.href, title: document.title })
        return true
      }

      // ── Extraction ──
      if (message.type === 'EXTRACT_CONTENT') {
        const type = message.extractType as 'text' | 'images' | 'links' | 'full'
        extractContent(type).then(sendResponse)
        return true
      }
    })
  },
})

// ─────────────────────────────────────────────
// EXTRACTION FUNCTIONS
// ─────────────────────────────────────────────

async function extractContent(type: 'text' | 'images' | 'links' | 'full') {
  const result: any = { type, url: window.location.href, title: document.title }

  if (type === 'text' || type === 'full') {
    result.text = extractText()
  }

  if (type === 'images' || type === 'full') {
    result.images = extractImages()
  }

  if (type === 'links' || type === 'full') {
    result.links = extractLinks()
  }

  return result
}

function extractText(): { content: string; excerpt: string; readingTime: number } {
  try {
    // Clone so we don't modify the live page
    const doc = document.cloneNode(true) as Document

    // Remove noise elements
    const noise = ['nav', 'header', 'footer', 'aside', '.sidebar', '.ads',
                   '.advertisement', '.cookie', 'script', 'style', 'noscript']
    noise.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove())
    })

    // Try to find the main content area
    const candidates = [
      doc.querySelector('article'),
      doc.querySelector('main'),
      doc.querySelector('[role="main"]'),
      doc.querySelector('.post-content'),
      doc.querySelector('.article-content'),
      doc.querySelector('.entry-content'),
      doc.querySelector('#content'),
      doc.body,
    ]

    const main = candidates.find(el => el && el.textContent && el.textContent.length > 200)
    const raw  = main?.innerText ?? doc.body?.innerText ?? ''

    // Clean up whitespace
    const content = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n')
      .slice(0, 8000)

    const excerpt      = content.slice(0, 300).replace(/\n/g, ' ')
    const wordCount    = content.split(/\s+/).length
    const readingTime  = Math.max(1, Math.ceil(wordCount / 200))

    return { content, excerpt, readingTime }
  } catch {
    return { content: '', excerpt: '', readingTime: 0 }
  }
}

function extractImages(): { src: string; alt: string; width: number; height: number }[] {
  const images: { src: string; alt: string; width: number; height: number }[] = []
  const seen = new Set<string>()

  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || ''
    if (!src || src.startsWith('data:') || seen.has(src)) return

    // Filter out tiny images (icons, trackers, spacers)
    const w = img.naturalWidth  || img.width  || 0
    const h = img.naturalHeight || img.height || 0
    if (w > 0 && w < 50)  return
    if (h > 0 && h < 50)  return

    seen.add(src)
    images.push({
      src,
      alt:    img.alt ?? '',
      width:  w,
      height: h,
    })
  })

  // Also check for CSS background images in key areas
  const bgCandidates = document.querySelectorAll(
    'article, main, .post, .entry, [style*="background-image"]'
  )
  bgCandidates.forEach(el => {
    const style = window.getComputedStyle(el).backgroundImage
    const match = style.match(/url\(["']?([^"')]+)["']?\)/)
    if (match && match[1] && !seen.has(match[1])) {
      seen.add(match[1])
      images.push({ src: match[1], alt: '', width: 0, height: 0 })
    }
  })

  return images.slice(0, 30) // cap at 30
}

function extractLinks(): { url: string; text: string; isExternal: boolean }[] {
  const links: { url: string; text: string; isExternal: boolean }[] = []
  const seen    = new Set<string>()
  const baseHost = window.location.hostname

  // Focus on content area links, not nav
  const noise = ['nav', 'header', 'footer', '.sidebar', '.menu']
  const noiseEls = new Set<Element>()
  noise.forEach(sel => document.querySelectorAll(sel).forEach(el => noiseEls.add(el)))

  document.querySelectorAll('a[href]').forEach(a => {
    // Skip if inside a noise element
    let parent = a.parentElement
    while (parent) {
      if (noiseEls.has(parent)) return
      parent = parent.parentElement
    }

    const href = (a as HTMLAnchorElement).href
    const text = a.textContent?.trim() ?? ''

    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return
    if (!text || text.length < 2 || text.length > 120) return
    if (seen.has(href)) return

    seen.add(href)

    let isExternal = false
    try { isExternal = new URL(href).hostname !== baseHost } catch {}

    links.push({ url: href, text, isExternal })
  })

  return links.slice(0, 50) // cap at 50
}

// ─────────────────────────────────────────────
// Area selector
// ─────────────────────────────────────────────
function startAreaSelector(): Promise<{
  x: number; y: number; w: number; h: number
} | null> {
  return new Promise((resolve) => {
    document.getElementById('__memex_selector__')?.remove()

    const overlay = document.createElement('div')
    overlay.id = '__memex_selector__'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      cursor: 'crosshair', background: 'rgba(0,0,0,0.4)', userSelect: 'none',
    })

    const box = document.createElement('div')
    Object.assign(box.style, {
      position: 'absolute', border: '2px solid #4f6ef7',
      background: 'rgba(79,110,247,0.12)', borderRadius: '2px',
      display: 'none', pointerEvents: 'none',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
    })
    overlay.appendChild(box)

    const label = document.createElement('div')
    Object.assign(label.style, {
      position: 'absolute', background: '#4f6ef7', color: '#fff',
      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
      pointerEvents: 'none', display: 'none', fontFamily: 'monospace',
    })
    overlay.appendChild(label)

    const hint = document.createElement('div')
    hint.textContent = 'Drag to select an area  •  Esc to cancel'
    Object.assign(hint.style, {
      position: 'fixed', top: '16px', left: '50%',
      transform: 'translateX(-50%)', background: '#111',
      color: '#e2e2e2', fontSize: '12px', padding: '7px 16px',
      borderRadius: '20px', border: '1px solid #333',
      pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: '2147483647',
      fontFamily: '-apple-system, sans-serif',
    })
    overlay.appendChild(hint)
    document.body.appendChild(overlay)

    let startX = 0, startY = 0, dragging = false

    function onMouseDown(e: MouseEvent) {
      e.preventDefault(); dragging = true
      startX = e.clientX; startY = e.clientY
      Object.assign(box.style, {
        display: 'block', left: `${startX}px`, top: `${startY}px`,
        width: '0', height: '0',
      })
      label.style.display = 'block'
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      const x = Math.min(e.clientX, startX), y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY)
      Object.assign(box.style, {
        left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`,
      })
      label.textContent = `${w} × ${h}`
      Object.assign(label.style, {
        left: `${x}px`, top: `${Math.max(0, y - 22)}px`,
      })
    }

    function cleanup() {
      overlay.remove()
      document.removeEventListener('keydown', onKeyDown)
    }

    function onMouseUp(e: MouseEvent) {
      if (!dragging) return; dragging = false
      const x = Math.min(e.clientX, startX), y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY)
      cleanup()
      if (w < 20 || h < 20) { resolve(null); return }
      resolve({
        x: x / window.innerWidth, y: y / window.innerHeight,
        w: w / window.innerWidth, h: h / window.innerHeight,
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { cleanup(); resolve(null) }
    }

    overlay.addEventListener('mousedown', onMouseDown)
    overlay.addEventListener('mousemove', onMouseMove)
    overlay.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keydown', onKeyDown)
  })
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getMeta(name: string): string | null {
  const el =
    document.querySelector(`meta[property="${name}"]`) ??
    document.querySelector(`meta[name="${name}"]`)
  return el?.getAttribute('content') ?? null
}

function getFavicon(): string {
  const selectors = [
    'link[rel="icon"][type="image/png"]',
    'link[rel="shortcut icon"]',
    'link[rel="icon"]',
    'link[rel="apple-touch-icon"]',
  ]
  for (const s of selectors) {
    const el = document.querySelector<HTMLLinkElement>(s)
    if (el?.href) return el.href
  }
  return `${window.location.origin}/favicon.ico`
}
