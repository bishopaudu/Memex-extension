export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_METADATA') {
        const metadata = {
          title:       document.title,
          description: getMeta('description') ?? getMeta('og:description') ?? '',
          ogImageUrl:  getMeta('og:image') ?? '',
          faviconUrl:  getFavicon(),
          url:         window.location.href,
        }
        sendResponse(metadata)
      }
      return true
    })
  },
})

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
  for (const selector of selectors) {
    const el = document.querySelector<HTMLLinkElement>(selector)
    if (el?.href) return el.href
  }
  return `${window.location.origin}/favicon.ico`
}
