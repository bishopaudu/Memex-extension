import { useState, useEffect } from 'react'
import { bookmarksApi, attachmentsApi, uploadApi } from '../lib/api'
import { SmartTagInput }  from './SmartTagInput'
import { ExtractPanel }  from './ExtractPanel'
import { cropImage } from '../lib/crop'

const DASHBOARD_URL = 'http://localhost:5173'

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
    const result = await chrome.storage.local.get('pendingAreaScreenshot')
    const pending = result.pendingAreaScreenshot
    if (!pending) return
    if (Date.now() - pending.timestamp > 60_000) {
      await chrome.storage.local.remove('pendingAreaScreenshot')
      return
    }
    try {
      const cropped = await cropImage(pending.fullDataUrl, pending.region)
      setAreaPreview({ dataUrl: cropped })
      await chrome.storage.local.remove('pendingAreaScreenshot')
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) chrome.action.setBadgeText({ text: '', tabId: tab.id })
    } catch {
      await chrome.storage.local.remove('pendingAreaScreenshot')
    }
  }

  async function checkPendingHighlight() {
    const result = await chrome.storage.local.get('pendingHighlight')
    const pending = result.pendingHighlight
    if (!pending) return
    if (Date.now() - pending.timestamp > 60_000) {
      await chrome.storage.local.remove('pendingHighlight')
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
    await chrome.storage.local.remove('pendingHighlight')
    // Clear badge
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) chrome.action.setBadgeText({ text: '', tabId: tab.id })
  }

  async function getCurrentTabInfo() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !tab?.id) return
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

    const base: PageInfo = {
      url: tab.url, title: tab.title ?? '',
      description: '', faviconUrl: tab.favIconUrl ?? '', ogImageUrl: '',
    }
    setPageInfo(base)
    setTitle(tab.title ?? '')

    try {
      const meta = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' })
      if (meta) { setPageInfo({ ...base, ...meta }); setTitle(meta.title || tab.title || '') }
    } catch { /* use base */ }
  }

  async function addFullScreenshot() {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png', quality: 90 })
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), type: 'screenshot', preview: dataUrl, status: 'pending',
      }])
    } catch (err) { console.error('Screenshot failed:', err) }
  }

  async function startAreaSelect() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    setSelectingArea(true)
    chrome.runtime.sendMessage({ type: 'START_AREA_SELECT_BG', tabId: tab.id })
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
      autoScreenshotDataUrl = await chrome.tabs.captureVisibleTab(
        undefined,
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
      <div className="flex flex-col h-full bg-[#0a0a0a]">
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
      <div className="flex flex-col bg-[#0a0a0a]" style={{ minHeight: 480 }}>
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
            <p className="text-sm font-semibold text-[#e2e2e2] mb-1">Saved to Memex</p>
            <p className="text-[11px] text-[#444]">
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
                     className="flex items-center gap-2.5 px-3 py-2 bg-[#111]
                                border border-[#1e1e1e] rounded-lg">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-7 h-7 object-cover rounded border border-[#252525]" />
                  ) : (
                    <div className="w-7 h-7 bg-[#161616] rounded flex items-center
                                    justify-center text-xs">📝</div>
                  )}
                  <p className="flex-1 text-[10px] text-[#888] truncate">
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
            onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                       bg-[#111] border border-[#1e1e1e] rounded-xl text-xs
                       text-[#666] hover:border-[#4f6ef7]/30 hover:text-[#7b93ff]
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
    <div className="flex flex-col bg-[#0a0a0a]" style={{ minHeight: 480 }}>
      <TopBar onLogout={onLogout} />

      {/* Page info card */}
      <div className="mx-3 mt-3 mb-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#111]
                        border border-[#1e1e1e] rounded-xl">
          {pageInfo.faviconUrl ? (
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg border border-[#252525]
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
            <div className="w-8 h-8 bg-[#1a1f3a] rounded-lg border border-[#252525]
                            flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#7b93ff]" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10
                         15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[#ccc] truncate leading-tight">
              {pageInfo.title || 'Untitled page'}
            </p>
            <p className="text-[10px] text-[#383838] truncate mt-0.5">
              {new URL(pageInfo.url).hostname.replace('www.', '')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-3 py-3 overflow-y-auto">

        {/* Title */}
        <div>
          <label className="block text-[10px] font-medium text-[#383838] uppercase
                            tracking-wider mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isBusy}
            className="w-full px-3 py-2 bg-[#111] border border-[#1e1e1e]
                       rounded-lg text-[12px] text-[#ccc] outline-none
                       focus:border-[#4f6ef7]/50 transition-colors disabled:opacity-40
                       placeholder-[#333]"
          />
        </div>

        {/* Smart tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-medium text-[#383838] uppercase
                              tracking-wider">Tags</label>
            <span className="text-[9px] text-[#2a2a2a]">
              click to add • type to create new
            </span>
          </div>
          <SmartTagInput tags={tags} onChange={setTags} />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-[10px] font-medium text-[#383838] uppercase
                            tracking-wider mb-1.5">
            Attachments
            {attachments.length > 0 && (
              <span className="ml-1.5 text-[#4f6ef7] normal-case font-normal">
                ({attachments.length})
              </span>
            )}
          </label>

          {/* Area preview */}
          {areaPreview && (
            <div className="mb-2 rounded-xl overflow-hidden border border-[#4f6ef7]/30
                            bg-[#111]">
              <img src={areaPreview.dataUrl} alt="Selected area"
                   className="w-full object-contain max-h-28" />
              <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e1e1e]">
                <span className="text-[10px] text-[#555] flex-1">Area selected</span>
                <button onClick={() => setAreaPreview(null)}
                        className="text-[10px] text-[#444] hover:text-[#888] px-2 py-1">
                  Discard
                </button>
                <button onClick={retryAreaSelect}
                        className="text-[10px] text-[#555] hover:text-[#999]
                                   border border-[#252525] px-2 py-1 rounded">
                  Retry
                </button>
                <button onClick={confirmAreaScreenshot}
                        className="text-[10px] text-white bg-[#4f6ef7] hover:bg-[#3b5bf5]
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
                     className="flex items-center gap-2 p-2 bg-[#111]
                                border border-[#1e1e1e] rounded-lg group">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-9 h-9 object-cover rounded border
                                    border-[#252525] flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-[#161616] rounded flex items-center
                                    justify-center text-sm flex-shrink-0">📝</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#888] truncate">
                      {att.type === 'text' ? att.content?.slice(0, 35)
                        : att.type === 'area_screenshot' ? 'Area screenshot' : 'Full screenshot'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#333]
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
                className="w-full px-3 py-2 bg-[#111] border border-[#4f6ef7]/40
                           rounded-lg text-[11px] text-[#ccc] placeholder-[#333]
                           outline-none resize-none"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] text-[#2a2a2a] flex-1">⌘↵ to add</span>
                <button onClick={() => { setAddingText(false); setTextInput('') }}
                        className="text-[10px] text-[#444] hover:text-[#888] px-2 py-1">
                  Cancel
                </button>
                <button onClick={addTextNote} disabled={!textInput.trim()}
                        className="text-[10px] text-white bg-[#4f6ef7] hover:bg-[#3b5bf5]
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
        </div>

        {saveState === 'error' && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-[11px] text-red-400">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-[#111]">
        <button
          onClick={handleSave}
          disabled={isBusy || !!areaPreview}
          className="w-full py-2.5 bg-[#4f6ef7] hover:bg-[#3b5bf5] disabled:opacity-40
                     text-white text-[13px] font-medium rounded-xl transition-colors
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
          <p className="text-center text-[9px] text-[#252525] mt-1.5">
            📸 Screenshot auto-captured on save
          </p>
        )}
        {areaPreview && (
          <p className="text-center text-[9px] text-[#444] mt-1.5">
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
                 bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]
                 hover:bg-[#141414] transition-all disabled:opacity-40"
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[9px] text-[#3a3a3a] font-medium">{label}</span>
    </button>
  )
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5
                    border-b border-[#111]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#4f6ef7] rounded-lg flex items-center
                        justify-center text-white font-bold text-[11px]">M</div>
        <span className="text-[13px] font-semibold text-[#ccc]
                         tracking-tight">Memex</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-[#444]
                     bg-[#111] border border-[#1a1a1a] rounded-lg
                     hover:text-[#7b93ff] hover:border-[#4f6ef7]/30
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
                     text-[#2a2a2a] hover:text-[#666] hover:bg-[#111]
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
