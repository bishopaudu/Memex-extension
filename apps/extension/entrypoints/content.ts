export default defineContentScript({
  matches: ['<all_urls>'],

  main() {

    // ── Page metadata ──
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {

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
    const raw  = (main as HTMLElement)?.innerText ?? doc.body?.innerText ?? ''

    // Clean up whitespace
    const content = raw
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
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
  const seen    = new Set<string>()
  const pageHost = window.location.hostname

  // Known CDN and image hosting domains that allow cross-origin loading
  const safeHosts = [
    'cloudinary.com', 'imgix.net', 'images.unsplash.com',
    'upload.wikimedia.org', 'cdn.', 'static.', 'assets.',
    'media.', 'images.', 'img.', 'photos.', 'pics.',
    'amazonaws.com', 'googleusercontent.com', 'githubusercontent.com',
    'gravatar.com', 'wp.com', 'wordpress.com',
  ]

  // Known problem patterns — skip these
  const skipPatterns = [
    'wp-includes',      // WordPress system images (often protected)
    'wp-admin',
    'pixel.gif',
    'pixel.png',
    '1x1',
    'spacer',
    'blank',
    'transparent',
    '.svg',             // SVGs often have CORS issues
    'favicon',
    'logo-blue-white',  // specific WordPress logo patterns
  ]

  function isSafeImage(src: string): boolean {
    try {
      const url  = new URL(src)
      const host = url.hostname.toLowerCase()
      const path = url.pathname.toLowerCase()

      // Same origin is always safe
      if (host === pageHost) return true

      // Check skip patterns
      if (skipPatterns.some(p => path.includes(p) || host.includes(p))) return false

      // Check safe CDN hosts
      if (safeHosts.some(safe => host.includes(safe))) return true

      // Major image formats on any domain — try but mark as potentially unsafe
      return true
    } catch {
      return false
    }
  }

  document.querySelectorAll('img').forEach(img => {
    // Get the best src available
    const src = img.src
      || img.getAttribute('data-src')
      || img.getAttribute('data-lazy-src')
      || img.getAttribute('data-original')
      || ''

    if (!src || src.startsWith('data:') || seen.has(src)) return

    // Filter out tiny images (icons, trackers, spacers)
    const w = img.naturalWidth  || img.width  || 0
    const h = img.naturalHeight || img.height || 0
    if (w > 0 && w < 80)  return
    if (h > 0 && h < 80)  return

    // Skip images that are not visible
    const rect = img.getBoundingClientRect()
    const style = window.getComputedStyle(img)
    if (style.display === 'none' || style.visibility === 'hidden') return

    if (!isSafeImage(src)) return

    seen.add(src)
    images.push({
      src,
      alt:    img.alt ?? img.title ?? '',
      width:  w,
      height: h,
    })
  })

  // Sort by size — larger images first (more likely to be content)
  images.sort((a, b) => (b.width * b.height) - (a.width * a.height))

  return images.slice(0, 24) // cap at 24 (fits 4-col grid nicely)
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

// ─────────────────────────────────────────────
// Floating inject button
// Draggable, dismissible, always visible
// ─────────────────────────────────────────────
const MEMEX_BTN_KEY = 'memex_floating_btn'
const MEMEX_POS_KEY = 'memex_btn_position'

async function initFloatingButton() {
  // Check if dismissed
  const stored = await browser.storage.local.get([MEMEX_BTN_KEY, MEMEX_POS_KEY])
  if (stored[MEMEX_BTN_KEY] === 'hidden') return

  const savedPos = stored[MEMEX_POS_KEY] as { x: number; y: number } | undefined

  // Create container
  const btn = document.createElement('div')
  btn.id = '__memex_float__'

  const RIGHT  = 28
  const BOTTOM = 80

  btn.style.cssText = `
    all: initial;
    position: fixed !important;
    z-index: 2147483647 !important;
    width: 44px !important;
    height: 44px !important;
    border-radius: 12px !important;
    background: #4B6BF5 !important;
    box-shadow: 0 4px 20px rgba(75,107,245,0.45), 0 2px 8px rgba(0,0,0,0.35) !important;
    cursor: grab !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    user-select: none !important;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s !important;
    font-family: -apple-system, sans-serif !important;
    ${savedPos
      ? `left: ${savedPos.x}px !important; top: ${savedPos.y}px !important;`
      : `right: ${RIGHT}px !important; bottom: ${BOTTOM}px !important;`
    }
  `

  // M logo SVG
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style="pointer-events:none;display:block">
      <rect width="24" height="24" rx="6" fill="#4B6BF5"/>
      <text x="4" y="19" font-family="-apple-system,sans-serif"
            font-weight="700" font-size="17" fill="white">M</text>
    </svg>
  `

  // Tooltip
  const tooltip = document.createElement('div')
  tooltip.style.cssText = `
    all: initial;
    position: absolute !important;
    right: 52px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    background: #181e30 !important;
    color: #f0f0f0 !important;
    font-family: -apple-system, sans-serif !important;
    font-size: 11px !important;
    padding: 5px 10px !important;
    border-radius: 6px !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    opacity: 0 !important;
    transition: opacity 0.15s !important;
    border: 1px solid #313c5e !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  `
  tooltip.textContent = 'Save to Memex'
  btn.appendChild(tooltip)

  // Dismiss × button
  const dismiss = document.createElement('div')
  dismiss.style.cssText = `
    all: initial;
    position: absolute !important;
    top: -7px !important;
    right: -7px !important;
    width: 18px !important;
    height: 18px !important;
    border-radius: 50% !important;
    background: #313c5e !important;
    color: #b8b8c8 !important;
    font-family: -apple-system, sans-serif !important;
    font-size: 12px !important;
    font-weight: bold !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    opacity: 0 !important;
    transition: opacity 0.15s, background 0.15s !important;
    border: 1.5px solid #3f4d74 !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
    line-height: 1 !important;
  `
  dismiss.textContent = '×'
  dismiss.title = 'Hide button'
  btn.appendChild(dismiss)

  document.documentElement.appendChild(btn)

  // ── Hover ──
  let isDragging = false

  btn.addEventListener('mouseenter', () => {
    if (isDragging) return
    btn.style.transform   = 'scale(1.1)'
    btn.style.boxShadow   = '0 6px 28px rgba(75,107,245,0.6), 0 2px 8px rgba(0,0,0,0.4)'
    tooltip.style.opacity = '1'
    dismiss.style.opacity = '1'
  })

  btn.addEventListener('mouseleave', () => {
    if (isDragging) return
    btn.style.transform   = 'scale(1)'
    btn.style.boxShadow   = '0 4px 20px rgba(75,107,245,0.45), 0 2px 8px rgba(0,0,0,0.35)'
    tooltip.style.opacity = '0'
    dismiss.style.opacity = '0'
  })

  dismiss.addEventListener('mouseenter', (e) => {
    e.stopPropagation()
    dismiss.style.background = '#4B6BF5'
    dismiss.style.color      = '#ffffff'
  })
  dismiss.addEventListener('mouseleave', (e) => {
    e.stopPropagation()
    dismiss.style.background = '#313c5e'
    dismiss.style.color      = '#b8b8c8'
  })

  // ── Dismiss ──
  dismiss.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()
    btn.style.transform = 'scale(0)'
    btn.style.opacity   = '0'
    await browser.storage.local.set({ [MEMEX_BTN_KEY]: 'hidden' })
    setTimeout(() => btn.remove(), 250)
  })

  // ── Drag ──
  let startMouseX = 0
  let startMouseY = 0
  let startBtnX   = 0
  let startBtnY   = 0
  let hasMoved    = false

  btn.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement) === dismiss) return
    if (e.button !== 0) return

    isDragging  = true
    hasMoved    = false
    startMouseX = e.clientX
    startMouseY = e.clientY

    const rect  = btn.getBoundingClientRect()
    startBtnX   = rect.left
    startBtnY   = rect.top

    // Switch from right/bottom to left/top positioning
    btn.style.right      = 'auto'
    btn.style.bottom     = 'auto'
    btn.style.left       = startBtnX + 'px'
    btn.style.top        = startBtnY + 'px'
    btn.style.cursor     = 'grabbing'
    btn.style.transition = 'none'

    e.preventDefault()
    e.stopPropagation()
  })

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved = true

    const newX = Math.max(8, Math.min(window.innerWidth  - 52, startBtnX + dx))
    const newY = Math.max(8, Math.min(window.innerHeight - 52, startBtnY + dy))

    btn.style.left = newX + 'px'
    btn.style.top  = newY + 'px'
  }

  const onMouseUp = async (e: MouseEvent) => {
    if (!isDragging) return
    isDragging = false

    btn.style.cursor     = 'grab'
    btn.style.transition = 'transform 0.15s, box-shadow 0.15s, opacity 0.2s'

    // Save new position
    const rect = btn.getBoundingClientRect()
    await browser.storage.local.set({
      [MEMEX_POS_KEY]: { x: rect.left, y: rect.top }
    })

    // If didn't move much → treat as click
    if (!hasMoved) {
      browser.runtime.sendMessage({ type: 'MEMEX_OPEN_POPUP' }).catch(() => {})
    }
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup',   onMouseUp)
}

// Run floating button after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingButton)
} else {
  initFloatingButton()
}
