export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
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

      if (message.type === 'START_AREA_SELECT') {
        startAreaSelector()
          .then(region => sendResponse({ region }))
          .catch(() => sendResponse({ region: null }))
        return true
      }
    })
  },
})

// ─────────────────────────────────────────────
// Area selector overlay
// ─────────────────────────────────────────────
function startAreaSelector(): Promise<{
  x: number; y: number; w: number; h: number
} | null> {
  return new Promise((resolve) => {
    // Remove any existing overlay first
    document.getElementById('__memex_selector__')?.remove()

    const overlay = document.createElement('div')
    overlay.id = '__memex_selector__'

    Object.assign(overlay.style, {
      position:       'fixed',
      inset:          '0',
      zIndex:         '2147483647',
      cursor:         'crosshair',
      background:     'rgba(0,0,0,0.4)',
      userSelect:     'none',
    })

    // Selection rectangle
    const box = document.createElement('div')
    Object.assign(box.style, {
      position:      'absolute',
      border:        '2px solid #4f6ef7',
      background:    'rgba(79,110,247,0.12)',
      borderRadius:  '2px',
      display:       'none',
      pointerEvents: 'none',
      boxShadow:     '0 0 0 9999px rgba(0,0,0,0.3)',
    })
    overlay.appendChild(box)

    // Dimensions label — shows w×h as user drags
    const label = document.createElement('div')
    Object.assign(label.style, {
      position:      'absolute',
      background:    '#4f6ef7',
      color:         '#fff',
      fontSize:      '11px',
      padding:       '2px 6px',
      borderRadius:  '4px',
      pointerEvents: 'none',
      display:       'none',
      fontFamily:    'monospace',
    })
    overlay.appendChild(label)

    // Hint bar at top
    const hint = document.createElement('div')
    hint.textContent = 'Drag to select an area  •  Esc to cancel'
    Object.assign(hint.style, {
      position:    'fixed',
      top:         '16px',
      left:        '50%',
      transform:   'translateX(-50%)',
      background:  '#111',
      color:       '#e2e2e2',
      fontSize:    '12px',
      padding:     '7px 16px',
      borderRadius: '20px',
      border:      '1px solid #333',
      pointerEvents: 'none',
      whiteSpace:  'nowrap',
      zIndex:      '2147483647',
      fontFamily:  '-apple-system, sans-serif',
    })
    overlay.appendChild(hint)

    document.body.appendChild(overlay)

    let startX = 0, startY = 0, dragging = false

    function onMouseDown(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
      dragging = true
      startX = e.clientX
      startY = e.clientY

      Object.assign(box.style, {
        display: 'block',
        left:    `${startX}px`,
        top:     `${startY}px`,
        width:   '0',
        height:  '0',
      })
      label.style.display = 'block'
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return

      const x = Math.min(e.clientX, startX)
      const y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX)
      const h = Math.abs(e.clientY - startY)

      Object.assign(box.style, {
        left:   `${x}px`,
        top:    `${y}px`,
        width:  `${w}px`,
        height: `${h}px`,
      })

      // Show dimensions
      label.textContent = `${w} × ${h}`
      Object.assign(label.style, {
        left: `${x}px`,
        top:  `${Math.max(0, y - 22)}px`,
      })
    }

    function cleanup() {
      overlay.remove()
      document.removeEventListener('keydown', onKeyDown)
    }

    function onMouseUp(e: MouseEvent) {
      if (!dragging) return
      dragging = false

      const x = Math.min(e.clientX, startX)
      const y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX)
      const h = Math.abs(e.clientY - startY)

      cleanup()

      // Ignore tiny accidental clicks
      if (w < 20 || h < 20) {
        resolve(null)
        return
      }

      resolve({
        x: x / window.innerWidth,
        y: y / window.innerHeight,
        w: w / window.innerWidth,
        h: h / window.innerHeight,
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup()
        resolve(null)
      }
    }

    overlay.addEventListener('mousedown',  onMouseDown)
    overlay.addEventListener('mousemove',  onMouseMove)
    overlay.addEventListener('mouseup',    onMouseUp)
    document.addEventListener('keydown',   onKeyDown)
  })
}

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

// The context menu item is created in background.ts
// Content script handles the actual text extraction
// and sends it to background when user selects highlight

// Listen for highlight save request from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    const selection = window.getSelection()
    const text      = selection?.toString().trim() ?? ''
    const range     = selection?.getRangeAt(0)

    // Get surrounding context (sentence before/after)
    let context = ''
    if (range) {
      const container = range.commonAncestorContainer
      const parent    = container.nodeType === 3
        ? container.parentElement
        : container as Element
      context = parent?.textContent?.slice(0, 300) ?? ''
    }

    sendResponse({
      text,
      context,
      url:   window.location.href,
      title: document.title,
    })
    return true
  }
})

// Listen for extract page request
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE_CONTENT') {
    try {
      // Clone the document so Readability doesn't modify the live page
      const documentClone = document.cloneNode(true) as Document
      const { Readability } = require('@mozilla/readability')
      const reader  = new Readability(documentClone)
      const article = reader.parse()

      sendResponse({
        title:       article?.title   ?? document.title,
        content:     article?.textContent?.slice(0, 5000) ?? '',
        excerpt:     article?.excerpt ?? '',
        byline:      article?.byline  ?? '',
        siteName:    article?.siteName ?? '',
        length:      article?.length  ?? 0,
        readingTime: article ? Math.ceil(article.length / 1000) : 0,
      })
    } catch (err) {
      sendResponse({ error: 'Could not extract content' })
    }
    return true
  }
})
