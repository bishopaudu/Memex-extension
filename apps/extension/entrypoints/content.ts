export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    // ── Page metadata extraction ──
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

      // ── Area selection mode ──
      if (message.type === 'START_AREA_SELECT') {
        startAreaSelector()
          .then(region => sendResponse({ region }))
          .catch(() => sendResponse({ region: null }))
        return true // keep channel open for async response
      }
    })
  },
})

// ─────────────────────────────────────────────
// AREA SELECTOR
// Injects a full-screen overlay the user drags
// to select a region. Returns { x, y, w, h }
// as percentages of the viewport.
// ─────────────────────────────────────────────
function startAreaSelector(): Promise<{
  x: number; y: number; w: number; h: number
} | null> {
  return new Promise((resolve) => {
    // Overlay covers the whole page
    const overlay = document.createElement('div')
    overlay.id = '__memex_selector__'

    Object.assign(overlay.style, {
      position:        'fixed',
      inset:           '0',
      zIndex:          '2147483647',
      cursor:          'crosshair',
      background:      'rgba(0, 0, 0, 0.35)',
      backdropFilter:  'blur(1px)',
      userSelect:      'none',
    })

    // Selection box — the blue rectangle the user draws
    const box = document.createElement('div')
    Object.assign(box.style, {
      position:     'absolute',
      border:       '2px solid #4f6ef7',
      background:   'rgba(79, 110, 247, 0.1)',
      borderRadius: '4px',
      display:      'none',
      pointerEvents: 'none',
    })
    overlay.appendChild(box)

    // Instruction label
    const hint = document.createElement('div')
    hint.textContent = 'Drag to select an area • Press Esc to cancel'
    Object.assign(hint.style, {
      position:        'fixed',
      top:             '16px',
      left:            '50%',
      transform:       'translateX(-50%)',
      background:      '#111',
      color:           '#e2e2e2',
      fontSize:        '12px',
      padding:         '6px 14px',
      borderRadius:    '20px',
      border:          '1px solid #333',
      pointerEvents:   'none',
      whiteSpace:      'nowrap',
    })
    overlay.appendChild(hint)

    document.body.appendChild(overlay)

    let startX = 0, startY = 0
    let isDragging = false

    function onMouseDown(e: MouseEvent) {
      e.preventDefault()
      isDragging = true
      startX = e.clientX
      startY = e.clientY

      Object.assign(box.style, {
        display: 'block',
        left:    `${startX}px`,
        top:     `${startY}px`,
        width:   '0px',
        height:  '0px',
      })
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return

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
    }

    function cleanup() {
      overlay.removeEventListener('mousedown', onMouseDown)
      overlay.removeEventListener('mousemove', onMouseMove)
      overlay.removeEventListener('mouseup',   onMouseUp)
      document.removeEventListener('keydown',  onKeyDown)
      overlay.remove()
    }

    function onMouseUp(e: MouseEvent) {
      if (!isDragging) return
      isDragging = false

      const x = Math.min(e.clientX, startX)
      const y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX)
      const h = Math.abs(e.clientY - startY)

      cleanup()

      // Minimum selection size — ignore accidental clicks
      if (w < 20 || h < 20) {
        resolve(null)
        return
      }

      // Convert to percentages of viewport
      // This makes the coordinates device-pixel-ratio independent
      const vw = window.innerWidth
      const vh = window.innerHeight

      resolve({
        x: x / vw,
        y: y / vh,
        w: w / vw,
        h: h / vh,
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup()
        resolve(null)
      }
    }

    overlay.addEventListener('mousedown', onMouseDown)
    overlay.addEventListener('mousemove', onMouseMove)
    overlay.addEventListener('mouseup',   onMouseUp)
    document.addEventListener('keydown',  onKeyDown)
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
