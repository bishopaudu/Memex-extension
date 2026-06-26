import { useState, useEffect } from 'react'
import { bookmarksApi, attachmentsApi, uploadApi, collectionsApi } from '../lib/api'
import { SmartTagInput }  from './SmartTagInput'
import { ExtractPanel }  from './ExtractPanel'
import { cropImage } from '../lib/crop'

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:5173'

interface PageInfo {
  url: string; title: string
  description: string; faviconUrl: string; ogImageUrl: string
}

interface Attachment {
  id:       string
  type:     'screenshot' | 'area_screenshot' | 'text'
  content?: string
  preview?: string
  status:   'pending' | 'uploading' | 'done' | 'error'
}

interface AreaPreview { dataUrl: string }

interface Props {
  onLogout:  () => void
  userEmail: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SaveScreen({ onLogout, userEmail }: Props) {
  const [pageInfo,      setPageInfo]      = useState<PageInfo | null>(null)
  const [title,         setTitle]         = useState('')
  const [tags,          setTags]          = useState<string[]>([])
  const [saveState,     setSaveState]     = useState<SaveState>('idle')
  const [btnVisible,      setBtnVisible]      = useState(true)
  const [showMenu,        setShowMenu]        = useState(false)
  const [userAvatarUrl,   setUserAvatarUrl]   = useState<string | null>(null)
  const [showCollections, setShowCollections] = useState(false)
  const [collections,    setCollections]    = useState<{id:string;name:string;icon:string;color:string}[]>([])
  const [selectedColl,   setSelectedColl]   = useState('')
  const [showAttachments, setShowAttachments] = useState(false)

  // Check floating button state + load avatar on mount
  useEffect(() => {
    fetchCollections()
    chrome.storage.local.get(['memex_floating_btn', 'memex_user']).then(r => {
      setBtnVisible(r.memex_floating_btn !== 'hidden')
      if (r.memex_user) {
        try {
          const u = JSON.parse(r.memex_user)
          if (u?.avatarUrl) setUserAvatarUrl(u.avatarUrl)
        } catch {}
      }
    })
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMenu) return
    const handler = () => setShowMenu(false)
    setTimeout(() => document.addEventListener('click', handler), 0)
    return () => document.removeEventListener('click', handler)
  }, [showMenu])

  async function openDashboard(path = '') {
    const result = await browser.storage.local.get('token') as { token?: string }
    const token  = result.token
    const url    = token
      ? `${DASHBOARD_URL}${path}?token=${token}`
      : `${DASHBOARD_URL}${path}`
    browser.tabs.create({ url })
  }

  async function fetchCollections() {
    try {
      const r = await collectionsApi.list()
      if (!r.error) setCollections(r.data.items)
    } catch {}
  }

  async function toggleFloatingButton() {
    const newState = btnVisible ? 'hidden' : 'visible'
    await chrome.storage.local.set({ memex_floating_btn: newState })
    setBtnVisible(!btnVisible)
  }
  const [errorMsg,      setErrorMsg]      = useState('')
  const [attachments,   setAttachments]   = useState<Attachment[]>([])
  const [addingText,    setAddingText]    = useState(false)
  const [textInput,     setTextInput]     = useState('')
  const [selectingArea,  setSelectingArea]  = useState(false)
  const [showExtract,      setShowExtract]      = useState(false)
  const [pendingHighlight, setPendingHighlight] = useState<{
    text: string; context: string; url: string; title: string
  } | null>(null)
  const [areaPreview,   setAreaPreview]   = useState<AreaPreview | null>(null)

  useEffect(() => {
    getCurrentTabInfo()
    checkPendingAreaScreenshot()
    checkPendingHighlight()
  }, [])

  async function checkPendingAreaScreenshot() {
    const result = await browser.storage.local.get('pendingAreaScreenshot') as { pendingAreaScreenshot?: any }
    const pending = result.pendingAreaScreenshot
    if (!pending) return
    if (Date.now() - pending.timestamp > 60_000) {
      await browser.storage.local.remove('pendingAreaScreenshot')
      return
    }
    try {
      const cropped = await cropImage(pending.fullDataUrl, pending.region)
      setAreaPreview({ dataUrl: cropped })
      await browser.storage.local.remove('pendingAreaScreenshot')
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) browser.action.setBadgeText({ text: '', tabId: tab.id })
    } catch {
      await browser.storage.local.remove('pendingAreaScreenshot')
    }
  }

  async function checkPendingHighlight() {
    const result = await browser.storage.local.get('pendingHighlight') as { pendingHighlight?: any }
    const pending = result.pendingHighlight
    if (!pending) return
    if (Date.now() - pending.timestamp > 60_000) {
      await browser.storage.local.remove('pendingHighlight')
      return
    }
    setPendingHighlight(pending)
    // Pre-add as text attachment
    setAttachments(prev => [...prev, {
      id:      crypto.randomUUID(),
      type:    'text',
      content: `"${pending.text}"`,
      status:  'pending',
    }])
    await browser.storage.local.remove('pendingHighlight')
    // Clear badge
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) browser.action.setBadgeText({ text: '', tabId: tab.id })
  }

  async function getCurrentTabInfo() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !tab?.id) return
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

    const base: PageInfo = {
      url: tab.url, title: tab.title ?? '',
      description: '', faviconUrl: tab.favIconUrl ?? '', ogImageUrl: '',
    }
    setPageInfo(base)
    setTitle(tab.title ?? '')

    try {
      const meta = await browser.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' })
      if (meta) { setPageInfo({ ...base, ...meta }); setTitle(meta.title || tab.title || '') }
    } catch { /* use base */ }
  }

  async function addFullScreenshot() {
    try {
      const dataUrl = await browser.tabs.captureVisibleTab({ format: 'png', quality: 90 })
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), type: 'screenshot', preview: dataUrl, status: 'pending',
      }])
    } catch (err) { console.error('Screenshot failed:', err) }
  }

  async function startAreaSelect() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    setSelectingArea(true)
    browser.runtime.sendMessage({ type: 'START_AREA_SELECT_BG', tabId: tab.id })
    setTimeout(() => window.close(), 400)
  }

  function confirmAreaScreenshot() {
    if (!areaPreview) return
    setAttachments(prev => [...prev, {
      id: crypto.randomUUID(), type: 'area_screenshot',
      preview: areaPreview.dataUrl, status: 'pending',
    }])
    setAreaPreview(null)
  }

  function retryAreaSelect() { setAreaPreview(null); startAreaSelect() }


  function addTextNote() {
    if (!textInput.trim()) return
    setAttachments(prev => [...prev, {
      id: crypto.randomUUID(), type: 'text',
      content: textInput.trim(), status: 'pending',
    }])
    setTextInput('')
    setAddingText(false)
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  async function handleSave() {
    if (!pageInfo) return
    setSaveState('saving')
    setErrorMsg('')

    // ── Step 1: Capture auto-screenshot BEFORE bookmark is created
    // We do this first because the popup closes during save and
    // captureVisibleTab only works while the tab is still active
    let autoScreenshotDataUrl: string | null = null
    try {
      autoScreenshotDataUrl = await browser.tabs.captureVisibleTab(
        { format: 'png', quality: 85 }
      )
    } catch {
      // Screenshot capture can fail on chrome:// pages etc — that's fine
    }

    // ── Step 2: Create the bookmark
    const result = await bookmarksApi.create({
      url:         pageInfo.url,
      title:       title || pageInfo.title,
      description: pageInfo.description,
      faviconUrl:  pageInfo.faviconUrl,
      ogImageUrl:  pageInfo.ogImageUrl,
      tags,
    })

    if (result.error) {
      setSaveState('error')
      setErrorMsg(result.error.message)
      return
    }

    const bookmarkId = result.data.bookmark.id

    // ── Step 3: Upload auto-screenshot + patch bookmark with URL
    // Do this BEFORE setSaveState so popup stays open during upload
    if (autoScreenshotDataUrl) {
      try {
        const uploadResult = await uploadApi.uploadScreenshot(autoScreenshotDataUrl)
        if (!uploadResult.error && uploadResult.data?.url) {
          await bookmarksApi.update(bookmarkId, {
            screenshotUrl: uploadResult.data.url,
            screenshotKey: uploadResult.data.publicId,
          })
        }
      } catch {
        // Non-critical — bookmark saved, screenshot just won't show
      }
    }

    // ── Step 4: Upload manual attachments (notes, area crops)
    // Also BEFORE setSaveState so popup stays alive during uploads
    await uploadAttachments(bookmarkId)

    // ── Step 5b: Add to collection if selected
    if (selectedColl && bookmarkId) {
      try {
        await collectionsApi.addBookmark(selectedColl, bookmarkId)
      } catch {}
    }

    // ── Step 5: NOW show saved state — all uploads complete
    setSaveState('saved')
  }

  async function uploadAttachments(bookmarkId: string) {
    for (const att of attachments) {
      setAttachments(prev =>
        prev.map(a => a.id === att.id ? { ...a, status: 'uploading' } : a)
      )
      try {
        if (att.type === 'text' && att.content) {
          await attachmentsApi.createText(bookmarkId, att.content)
        } else if (att.preview) {
          console.log('[Memex] Uploading image attachment, type:', att.type)
          const uploadResult = await uploadApi.uploadScreenshot(att.preview)
          console.log('[Memex] Upload result:', uploadResult)
          if (uploadResult.error) {
            console.error('[Memex] Upload failed:', uploadResult.error)
            throw new Error(uploadResult.error.message)
          }
          if (uploadResult.data?.url) {
            const attResult = await attachmentsApi.createScreenshot(
              bookmarkId,
              uploadResult.data.url,
              uploadResult.data.publicId,
              att.type === 'area_screenshot' ? 'area_screenshot' : 'screenshot'
            )
            console.log('[Memex] Attachment created:', attResult)
            if (attResult.error) {
              console.error('[Memex] Create attachment failed:', attResult.error)
              throw new Error(attResult.error.message)
            }
          }
        }
        setAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, status: 'done' } : a)
        )
      } catch (err) {
        console.error('[Memex] Attachment upload failed:', err, att)
        setAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, status: 'error' } : a)
        )
      }
    }
  }

  if (!pageInfo) {
    return (
      <div className="flex flex-col min-h-[480px] bg-[#12172a]">
        <TopBar onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#4f6ef7] border-t-transparent
                          rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ── Saved state ──
  if (saveState === 'saved') {
    const uploading = attachments.filter(a => a.status === 'uploading').length
    const done      = attachments.filter(a => a.status === 'done').length

    return (
      <div className="flex flex-col bg-[#12172a]" style={{ minHeight: 480 }}>
        {/* Profile bar */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#313c5e]
                        bg-[#181e30]">
          <div className="w-7 h-7 rounded-full bg-[#4B6BF5] flex items-center
                          justify-center text-white font-bold text-[11px] flex-shrink-0">
            {userEmail?.[0]?.toUpperCase() ?? 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#f0f0f0] font-medium truncate">
              {userEmail}
            </p>
            <p className="text-[9px] text-[#606080]">Memex</p>
          </div>
          <button
            onClick={toggleFloatingButton}
            className="text-[10px] text-[#606080] hover:text-[#93a8fa]
                       transition-colors px-2 py-1 rounded flex-shrink-0"
            title={btnVisible ? 'Hide floating button' : 'Show floating button'}
          >
            {btnVisible ? '📌' : '📍'}
          </button>

          <button
            onClick={onLogout}
            className="text-[10px] text-[#606080] hover:text-[#8888a0]
                       transition-colors px-2 py-1 rounded flex-shrink-0"
          >
            Sign out
          </button>
        </div>
        <TopBar onLogout={onLogout} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">

          {/* Success animation ring */}
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-green-500/30
                            flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border
                              border-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-[#f0f0f0] mb-1">Saved to Memex</p>
            <p className="text-[11px] text-[#aaaaaa]">
              {attachments.length > 0
                ? uploading > 0
                  ? `Uploading ${uploading} attachment${uploading > 1 ? 's' : ''}...`
                  : `${done} attachment${done > 1 ? 's' : ''} attached`
                : 'Your bookmark is ready'}
            </p>
          </div>

          {/* Attachment upload status */}
          {attachments.length > 0 && (
            <div className="w-full flex flex-col gap-1.5">
              {attachments.map(att => (
                <div key={att.id}
                     className="flex items-center gap-2.5 px-3 py-2 bg-[#1f2640]
                                border border-[#313c5e] rounded-lg">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-7 h-7 object-cover rounded border border-[#3f4d74]" />
                  ) : (
                    <div className="w-7 h-7 bg-[#272f4d] rounded flex items-center
                                    justify-center text-xs">📝</div>
                  )}
                  <p className="flex-1 text-[10px] text-[#8888a0] truncate">
                    {att.type === 'text' ? att.content?.slice(0, 30) + '...'
                      : att.type === 'area_screenshot' ? 'Area screenshot' : 'Full screenshot'}
                  </p>
                  {att.status === 'uploading' && (
                    <div className="w-3 h-3 border-2 border-[#4f6ef7]
                                    border-t-transparent rounded-full animate-spin" />
                  )}
                  {att.status === 'done' && (
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center
                                    justify-center">
                      <svg className="w-2.5 h-2.5 text-green-400" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  )}
                  {att.status === 'error' && (
                    <span className="text-[10px] text-red-400">failed</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => openDashboard()}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                       bg-[#1f2640] border border-[#313c5e] rounded-xl text-xs
                       text-[#8888a0] hover:border-[#4f6ef7]/30 hover:text-[#93a8fa]
                       transition-all"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            View in dashboard
          </button>
        </div>
      </div>
    )
  }

  const isBusy = saveState === 'saving'

  return (
    <div className="flex flex-col bg-[#12172a]" style={{ minHeight: 480 }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 py-2.5
                      border-b border-[#313c5e] bg-[#181e30]">
        {/* Logo + name */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#4B6BF5] flex items-center
                          justify-center text-white font-bold text-[11px]">
            M
          </div>
          <span className="text-[12px] font-semibold text-[#f0f0f0]">Memex</span>
        </div>

        {/* Right — avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(prev => !prev)}
            className="flex items-center justify-center w-7 h-7 rounded-full
                       overflow-hidden border-2 border-transparent
                       hover:border-[#4B6BF5] transition-all"
            title={userEmail}
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#4B6BF5] flex items-center
                              justify-center text-white font-bold text-[11px]">
                {userEmail?.[0]?.toUpperCase() ?? 'M'}
              </div>
            )}
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-9 w-44 bg-[#1f2640] border
                            border-[#313c5e] rounded-xl shadow-2xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-[#313c5e]">
                <p className="text-[11px] font-medium text-[#f0f0f0] truncate">
                  {userEmail}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { openDashboard(); setShowMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                             text-[#b8b8c8] hover:text-[#f0f0f0] hover:bg-[#272f4d]
                             transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 text-[#4B6BF5]" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    browser.tabs.create({ url: `${DASHBOARD_URL}/help` })
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                             text-[#b8b8c8] hover:text-[#f0f0f0] hover:bg-[#272f4d]
                             transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 text-[#93a8fa]" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Help
                </button>

                <button
                  onClick={() => {
                    browser.tabs.create({ url: `${DASHBOARD_URL}/feedback` })
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                             text-[#b8b8c8] hover:text-[#f0f0f0] hover:bg-[#272f4d]
                             transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 text-[#93a8fa]" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  Feedback
                </button>

                <button
                  onClick={() => {
                    toggleFloatingButton()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                             text-[#b8b8c8] hover:text-[#f0f0f0] hover:bg-[#272f4d]
                             transition-colors text-left"
                >
                  <span className="text-[13px]">{btnVisible ? '📌' : '📍'}</span>
                  {btnVisible ? 'Hide page button' : 'Show page button'}
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-[#313c5e] py-1">
                <button
                  onClick={() => { onLogout(); setShowMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px]
                             text-[#f87171] hover:bg-[#2a0d0d]
                             transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page info card */}
      <div className="mx-3 mt-3 mb-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#1f2640]
                        border border-[#313c5e] rounded-xl">
          {pageInfo.faviconUrl ? (
            <div className="w-8 h-8 bg-[#272f4d] rounded-lg border border-[#3f4d74]
                            flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={pageInfo.faviconUrl}
                alt=""
                className="w-5 h-5 object-contain"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-[#1a2550] rounded-lg border border-[#3f4d74]
                            flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#93a8fa]" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10
                         15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[#f0f0f0] truncate leading-tight">
              {pageInfo.title || 'Untitled page'}
            </p>
            <p className="text-[10px] text-[#8888a0] truncate mt-0.5">
              {new URL(pageInfo.url).hostname.replace('www.', '')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-0 px-3 py-3 overflow-y-auto">

        {/* Title */}
        <div className="mb-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isBusy}
            placeholder="Title"
            className="w-full px-3 py-2.5 bg-[#1f2640] border border-[#313c5e]
                       rounded-xl text-[13px] text-[#f0f0f0] outline-none font-medium
                       focus:border-[#4B6BF5] transition-colors disabled:opacity-40
                       placeholder-[#606080]"
          />
        </div>

        {/* Tags */}
        <div className="mb-3">
          <SmartTagInput tags={tags} onChange={setTags} />
        </div>

        {/* Divider */}
        <div className="border-t border-[#1f2640] mb-1" />

        {/* Collections — collapsible */}
        <div className="mb-1">
          <button
            onClick={() => setShowCollections(prev => !prev)}
            className="w-full flex items-center justify-between py-2 text-left group"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#606080]" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              <span className="text-[12px] text-[#8888a0] group-hover:text-[#b8b8c8]
                               transition-colors">
                Collection
                {selectedColl && (
                  <span className="ml-1.5 text-[#93a8fa] text-[11px]">
                    {collections.find(c => c.id === selectedColl)?.name ?? ''}
                  </span>
                )}
              </span>
            </div>
            <svg className={`w-3 h-3 text-[#606080] transition-transform
                            ${showCollections ? 'rotate-180' : ''}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showCollections && (
            <div className="pb-2">
              {collections.length === 0 ? (
                <p className="text-[11px] text-[#606080] px-1 py-1">
                  No collections yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => setSelectedColl('')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all
                                ${!selectedColl
                                  ? 'bg-[#1a2550] border-[#4B6BF5]/40 text-[#93a8fa]'
                                  : 'bg-[#1f2640] border-[#313c5e] text-[#606080] hover:border-[#3f4d74]'}`}
                  >
                    None
                  </button>
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedColl(
                        prev => prev === col.id ? '' : col.id
                      )}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                                  text-[11px] border transition-all
                                  ${selectedColl === col.id
                                    ? 'border-[#4B6BF5]/40 text-[#93a8fa]'
                                    : 'bg-[#1f2640] border-[#313c5e] text-[#606080] hover:border-[#3f4d74] hover:text-[#8888a0]'}`}
                      style={selectedColl === col.id
                        ? { background: col.color + '18', borderColor: col.color + '50', color: col.color }
                        : {}}
                    >
                      <span>{col.icon}</span>
                      <span className="truncate max-w-[80px]">{col.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attachments — collapsible */}
        <div className="mb-1">
          <button
            onClick={() => setShowAttachments(prev => !prev)}
            className="w-full flex items-center justify-between py-2 text-left
                       group"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#606080]" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19
                         a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              <span className="text-[12px] text-[#8888a0] group-hover:text-[#b8b8c8]
                               transition-colors">
                Attachments
                {attachments.length > 0 && (
                  <span className="ml-1.5 text-[#4B6BF5]">
                    {attachments.length}
                  </span>
                )}
              </span>
            </div>
            <svg className={`w-3 h-3 text-[#606080] transition-transform
                            ${showAttachments ? 'rotate-180' : ''}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        <div className={showAttachments ? 'block' : 'hidden'}>

          {/* Area preview */}
          {areaPreview && (
            <div className="mb-2 rounded-xl overflow-hidden border border-[#4f6ef7]/30
                            bg-[#1f2640]">
              <img src={areaPreview.dataUrl} alt="Selected area"
                   className="w-full object-contain max-h-28" />
              <div className="flex items-center gap-2 px-3 py-2 border-t border-[#313c5e]">
                <span className="text-[10px] text-[#bbbbbb] flex-1">Area selected</span>
                <button onClick={() => setAreaPreview(null)}
                        className="text-[10px] text-[#aaaaaa] hover:text-[#8888a0] px-2 py-1">
                  Discard
                </button>
                <button onClick={retryAreaSelect}
                        className="text-[10px] text-[#bbbbbb] hover:text-[#b8b8c8]
                                   border border-[#3f4d74] px-2 py-1 rounded">
                  Retry
                </button>
                <button onClick={confirmAreaScreenshot}
                        className="text-[10px] text-white bg-[#4B6BF5] hover:bg-[#3b5bf5]
                                   px-3 py-1 rounded font-medium transition-colors">
                  Add ✓
                </button>
              </div>
            </div>
          )}

          {/* Existing attachments list */}
          {attachments.length > 0 && !areaPreview && (
            <div className="flex flex-col gap-1.5 mb-2">
              {attachments.map(att => (
                <div key={att.id}
                     className="flex items-center gap-2 p-2 bg-[#1f2640]
                                border border-[#313c5e] rounded-lg group">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-9 h-9 object-cover rounded border
                                    border-[#3f4d74] flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-[#272f4d] rounded flex items-center
                                    justify-center text-sm flex-shrink-0">📝</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#8888a0] truncate">
                      {att.type === 'text' ? att.content?.slice(0, 35)
                        : att.type === 'area_screenshot' ? 'Area screenshot' : 'Full screenshot'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#8888a0]
                               hover:text-red-400 p-1 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text composer */}
          {addingText && (
            <div className="mb-2">
              <textarea
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.metaKey) addTextNote()
                  if (e.key === 'Escape') { setAddingText(false); setTextInput('') }
                }}
                placeholder="Type a note, quote, or thought..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1f2640] border border-[#4f6ef7]/40
                           rounded-lg text-[11px] text-[#f0f0f0] placeholder-[#666666]
                           outline-none resize-none"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] text-[#8888a0] flex-1">⌘↵ to add</span>
                <button onClick={() => { setAddingText(false); setTextInput('') }}
                        className="text-[10px] text-[#aaaaaa] hover:text-[#8888a0] px-2 py-1">
                  Cancel
                </button>
                <button onClick={addTextNote} disabled={!textInput.trim()}
                        className="text-[10px] text-white bg-[#4B6BF5] hover:bg-[#3b5bf5]
                                   disabled:opacity-30 px-3 py-1 rounded font-medium
                                   transition-colors">
                  Add note
                </button>
              </div>
            </div>
          )}

          {/* Extract panel */}
          {showExtract && (
            <ExtractPanel
              onAdd={att => {
                setAttachments(prev => [...prev, {
                  ...att,
                  id:     crypto.randomUUID(),
                  status: 'pending' as const,
                }])
              }}
              onClose={() => setShowExtract(false)}
            />
          )}

          {/* Attachment buttons */}
          {!addingText && !areaPreview && !showExtract && (
            <div className="grid grid-cols-2 gap-2">
              <AttachBtn emoji="📸" label="Screenshot" onClick={addFullScreenshot} />
              <AttachBtn
                emoji="✂️"
                label="Select area"
                onClick={startAreaSelect}
                disabled={selectingArea}
                hint="Popup closes while selecting"
              />
              <AttachBtn emoji="📝" label="Text note"
                         onClick={() => setAddingText(true)} />
              <AttachBtn
                emoji="📰"
                label="Extract page"
                onClick={() => setShowExtract(true)}
                hint="Extract text, images or links from this page"
              />
            </div>
          )}
        </div>{/* end collapsible attachments content */}
        </div>{/* end attachments section */}

        {saveState === 'error' && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-[11px] text-red-400">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2.5 border-t border-[#313c5e] bg-[#12172a]">
        <button
          onClick={handleSave}
          disabled={isBusy || !!areaPreview}
          className="w-full py-3 bg-[#4B6BF5] hover:bg-[#3452d0] disabled:opacity-40
                     text-white text-[13px] font-semibold rounded-xl transition-colors
                     shadow-lg shadow-[#4B6BF5]/20
                     flex items-center justify-center gap-2"
        >
          {isBusy ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white
                              rounded-full animate-spin" />
              {attachments.length > 0
                ? 'Saving & uploading...'
                : 'Saving...'}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
              Save to Memex
              {attachments.length > 0 && (
                <span className="bg-white/20 text-[11px] px-1.5 py-0.5 rounded-full">
                  +{attachments.length}
                </span>
              )}
            </>
          )}
        </button>
        {!areaPreview && (
          <p className="text-center text-[9px] text-[#bbbbbb] mt-1.5">
            📸 Screenshot auto-captured on save
          </p>
        )}
        {areaPreview && (
          <p className="text-center text-[9px] text-[#aaaaaa] mt-1.5">
            Confirm or discard selection first
          </p>
        )}
      </div>
    </div>
  )
}

function AttachBtn({ emoji, label, onClick, disabled, hint }: {
  emoji: string; label: string; onClick: () => void
  disabled?: boolean; hint?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border
                 bg-[#1f2640] border-[#272f4d] hover:border-[#444444]
                 hover:bg-[#141414] transition-all disabled:opacity-40"
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[9px] text-[#999999] font-medium">{label}</span>
    </button>
  )
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5
                    border-b border-[#111]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#4B6BF5] rounded-lg flex items-center
                        justify-center text-white font-bold text-[11px]">M</div>
        <span className="text-[13px] font-semibold text-[#f0f0f0]
                         tracking-tight">Memex</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => openDashboard()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-[#aaaaaa]
                     bg-[#1f2640] border border-[#272f4d] rounded-lg
                     hover:text-[#93a8fa] hover:border-[#4f6ef7]/30
                     transition-all"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
        <button
          onClick={onLogout}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-[#8888a0] hover:text-[#8888a0] hover:bg-[#1f2640]
                     transition-colors"
          title="Sign out"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
