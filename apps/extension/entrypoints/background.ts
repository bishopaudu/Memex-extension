export default defineBackground(() => {

  // Create the right-click context menu item
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id:       'save-highlight',
      title:    'Save highlight to Memex',
      contexts: ['selection'],  // only shows when text is selected
    })
  })

  // Handle context menu click
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'save-highlight') return
    if (!tab?.id) return

    // Get the selected text + context from content script
    const result = await browser.tabs.sendMessage(tab.id, {
      type: 'GET_SELECTED_TEXT'
    }).catch(() => null)

    if (!result?.text) return

    // Store the highlight for the popup to pick up
    await browser.storage.local.set({
      pendingHighlight: {
        text:      result.text,
        context:   result.context,
        url:       result.url || tab.url,
        title:     result.title || tab.title,
        timestamp: Date.now(),
      }
    })

    // Badge to tell user to open popup
    browser.action.setBadgeText({ text: '✦', tabId: tab.id })
    browser.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tab.id })
  })

  // Area select handler (existing)
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'START_AREA_SELECT_BG') {
      handleAreaSelect(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true
    }

    if (message.type === 'CAPTURE_TAB') {
      browser.tabs.captureVisibleTab(
        { format: 'png', quality: 90 }
      ).then((dataUrl) => { sendResponse({ dataUrl }) })
      return true
    }
  })
})

async function handleAreaSelect(tabId: number) {
  const response = await browser.tabs.sendMessage(tabId, {
    type: 'START_AREA_SELECT'
  })

  const region = response?.region
  if (!region) {
    await browser.storage.local.remove('pendingAreaScreenshot')
    return
  }

  const dataUrl = await browser.tabs.captureVisibleTab(
    { format: 'png', quality: 90 }
  )

  await browser.storage.local.set({
    pendingAreaScreenshot: {
      fullDataUrl: dataUrl,
      region,
      timestamp:   Date.now(),
    }
  })

  browser.action.setBadgeText({ text: '1', tabId })
  browser.action.setBadgeBackgroundColor({ color: '#4f6ef7', tabId })
}
