export default defineBackground(() => {

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    if (message.type === 'START_AREA_SELECT_BG') {
      handleAreaSelect(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
          console.error('[BG] Area select failed:', err)
          sendResponse({ ok: false })
        })
      return true // keep channel open for async
    }

    if (message.type === 'CAPTURE_TAB') {
      chrome.tabs.captureVisibleTab(
        undefined,
        { format: 'png', quality: 90 },
        (dataUrl) => {
          sendResponse({ dataUrl })
        }
      )
      return true
    }
  })
})

// ─────────────────────────────────────────────
// The full area select flow — runs in background
// Background survives popup close
// ─────────────────────────────────────────────
async function handleAreaSelect(tabId: number) {
  // 1. Tell content script to show the selector overlay
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'START_AREA_SELECT'
  })

  const region = response?.region
  if (!region) {
    // User cancelled — clear any pending state
    await chrome.storage.local.remove('pendingAreaScreenshot')
    return
  }

  // 2. Capture the full screenshot from background
  // (background can capture even without popup open)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      undefined,
      { format: 'png', quality: 90 },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      }
    )
  })

  // 3. Crop the image to the selected region
  // We can't use canvas in a service worker, so we store both
  // the full screenshot and the region, and crop in the popup
  await chrome.storage.local.set({
    pendingAreaScreenshot: {
      fullDataUrl: dataUrl,
      region,
      timestamp: Date.now(),
    }
  })

  // 4. Badge the extension icon so user knows to click it
  chrome.action.setBadgeText({ text: '1', tabId })
  chrome.action.setBadgeBackgroundColor({ color: '#4f6ef7', tabId })
}
