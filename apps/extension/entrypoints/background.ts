export default defineBackground(() => {

  // Create the right-click context menu item
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id:       'save-highlight',
      title:    'Save highlight to Memex',
      contexts: ['selection'],  // only shows when text is selected
    })
  })

  // Handle context menu click
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'save-highlight') return
    if (!tab?.id) return

    // Get the selected text + context from content script
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_SELECTED_TEXT'
    }).catch(() => null)

    if (!result?.text) return

    // Store the highlight for the popup to pick up
    await chrome.storage.local.set({
      pendingHighlight: {
        text:      result.text,
        context:   result.context,
        url:       result.url || tab.url,
        title:     result.title || tab.title,
        timestamp: Date.now(),
      }
    })

    // Badge to tell user to open popup
    chrome.action.setBadgeText({ text: '✦', tabId: tab.id })
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tab.id })
  })

  // Area select handler (existing)
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'START_AREA_SELECT_BG') {
      handleAreaSelect(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true
    }

    if (message.type === 'CAPTURE_TAB') {
      chrome.tabs.captureVisibleTab(
        undefined,
        { format: 'png', quality: 90 },
        (dataUrl) => { sendResponse({ dataUrl }) }
      )
      return true
    }
  })
})

async function handleAreaSelect(tabId: number) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'START_AREA_SELECT'
  })

  const region = response?.region
  if (!region) {
    await chrome.storage.local.remove('pendingAreaScreenshot')
    return
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      undefined,
      { format: 'png', quality: 90 },
      (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(result)
      }
    )
  })

  await chrome.storage.local.set({
    pendingAreaScreenshot: {
      fullDataUrl: dataUrl,
      region,
      timestamp:   Date.now(),
    }
  })

  chrome.action.setBadgeText({ text: '1', tabId })
  chrome.action.setBadgeBackgroundColor({ color: '#4f6ef7', tabId })
}
