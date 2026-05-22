import { useState, useEffect } from 'react'
import { bookmarksApi, attachmentsApi } from '../lib/api'
import { uploadApi } from '../lib/api'
import { TagInput } from './TagInput'
import { cropImage } from '../lib/crop'

const DASHBOARD_URL = 'http://localhost:5173'

interface PageInfo {
  url: string; title: string; description: string
  faviconUrl: string; ogImageUrl: string
}

interface Attachment {
  id:       string
  type:     'screenshot' | 'area_screenshot' | 'text'
  content?: string   // for text notes
  preview?: string   // base64 preview for images
  status:   'pending' | 'uploading' | 'done' | 'error'
}

// The confirmation state after area selection
interface AreaPreview {
  dataUrl: string   // the cropped image
  status:  'confirming' | 'adding'
}

interface Props {
  onLogout:  () => void
  userEmail: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SaveScreen({ onLogout, userEmail }: Props) {
  const [pageInfo,     setPageInfo]     = useState<PageInfo | null>(null)
  const [title,        setTitle]        = useState('')
  const [tags,         setTags]         = useState<string[]>([])
  const [saveState,    setSaveState]    = useState<SaveState>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [attachments,  setAttachments]  = useState<Attachment[]>([])
  const [addingText,   setAddingText]   = useState(false)
  const [textInput,    setTextInput]    = useState('')

  // Area screenshot states
  const [selectingArea, setSelectingArea] = useState(false)
  const [areaPreview,   setAreaPreview]   = useState<AreaPreview | null>(null)

  useEffect(() => { getCurrentTabInfo() }, [])

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
      if (meta) {
        setPageInfo({ ...base, ...meta })
        setTitle(meta.title || tab.title || '')
      }
    } catch { /* use base info */ }
  }

  // ─────────────────────────────────────────────
  // FULL SCREENSHOT
  // ─────────────────────────────────────────────
  async function addFullScreenshot() {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(
        undefined, { format: 'png', quality: 90 }
      )
      setAttachments(prev => [...prev, {
        id:      crypto.randomUUID(),
        type:    'screenshot',
        preview: dataUrl,
        status:  'pending',
      }])
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }

  // ─────────────────────────────────────────────
  // AREA SCREENSHOT — Step 1: trigger selection
  // ─────────────────────────────────────────────
  async function startAreaSelect() {
    setSelectingArea(true)
    setAreaPreview(null)

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) { setSelectingArea(false); return }

    try {
      // Content script shows the drag overlay
      // Returns the selected region as percentages
      const { region } = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_AREA_SELECT'
      })

      if (!region) {
        // User pressed Escape or selection too small
        setSelectingArea(false)
        return
      }

      // Capture full screenshot then crop to region
      const fullDataUrl = await chrome.tabs.captureVisibleTab(
        undefined, { format: 'png', quality: 90 }
      )
      const croppedDataUrl = await cropImage(fullDataUrl, region)

      // Show confirmation preview — don't add to queue yet
      setAreaPreview({ dataUrl: croppedDataUrl, status: 'confirming' })
    } catch (err) {
      console.error('Area select failed:', err)
    }

    setSelectingArea(false)
  }

  // ─────────────────────────────────────────────
  // AREA SCREENSHOT — Step 2: user confirms
  // ─────────────────────────────────────────────
  function confirmAreaScreenshot() {
    if (!areaPreview) return
    setAttachments(prev => [...prev, {
      id:      crypto.randomUUID(),
      type:    'area_screenshot',
      preview: areaPreview.dataUrl,
      status:  'pending',
    }])
    setAreaPreview(null)
  }

  // User wants to try selecting a different area
  function retryAreaSelect() {
    setAreaPreview(null)
    startAreaSelect()
  }

  // User cancels the preview
  function cancelAreaPreview() {
    setAreaPreview(null)
  }

  // ─────────────────────────────────────────────
  // TEXT NOTE
  // ─────────────────────────────────────────────
  function addTextNote() {
    if (!textInput.trim()) return
    setAttachments(prev => [...prev, {
      id:      crypto.randomUUID(),
      type:    'text',
      content: textInput.trim(),
      status:  'pending',
    }])
    setTextInput('')
    setAddingText(false)
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // ─────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────
  async function handleSave() {
    if (!pageInfo) return
    setSaveState('saving')
    setErrorMsg('')

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
    setSaveState('saved')

    // Upload attachments in background
    uploadAttachments(bookmarkId)
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
          await attachmentsApi.createAreaScreenshot(bookmarkId, att.preview)
        }

        setAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, status: 'done' } : a)
        )
      } catch {
        setAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, status: 'error' } : a)
        )
      }
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (!pageInfo) {
    return (
      <div className="flex flex-col h-full bg-[#0d0d0d]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-[#4f6ef7] border-t-transparent
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
      <div className="flex flex-col h-full bg-[#0d0d0d]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex-1 flex flex-col p-4 gap-3">
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border
                          border-green-500/20 rounded-xl">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-[#e2e2e2]">Bookmark saved!</p>
              {attachments.length > 0 && (
                <p className="text-[10px] text-[#666]">
                  {uploading > 0
                    ? `Uploading ${uploading} attachment${uploading > 1 ? 's' : ''}...`
                    : `${done} attachment${done > 1 ? 's' : ''} uploaded`}
                </p>
              )}
            </div>
          </div>

          {/* Upload progress per attachment */}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {attachments.map(att => (
                <div key={att.id}
                     className="flex items-center gap-2 px-3 py-2 bg-[#111]
                                border border-[#1e1e1e] rounded-lg">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-8 h-8 object-cover rounded border border-[#252525]
                                    flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-[#161616] rounded flex items-center
                                    justify-center flex-shrink-0 text-sm">��</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#ccc] truncate">
                      {att.type === 'text'
                        ? att.content?.slice(0, 35) + '...'
                        : att.type === 'area_screenshot'
                          ? 'Area screenshot'
                          : 'Full screenshot'}
                    </p>
                  </div>
                  {att.status === 'uploading' && (
                    <div className="w-3 h-3 border-2 border-[#4f6ef7] border-t-transparent
                                    rounded-full animate-spin flex-shrink-0" />
                  )}
                  {att.status === 'done' && (
                    <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                  {att.status === 'error' && (
                    <span className="text-[10px] text-red-400 flex-shrink-0">failed</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
            className="flex items-center justify-center gap-2 px-4 py-2.5 mt-auto
                       bg-[#161616] border border-[#252525] rounded-xl text-xs
                       text-[#999] hover:border-[#4f6ef7] hover:text-[#7b93ff]
                       transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Open dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <Header userEmail={userEmail} onLogout={onLogout} />

      {/* Page preview strip */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#111]
                      border-b border-[#1e1e1e]">
        {pageInfo.faviconUrl && (
          <img src={pageInfo.faviconUrl} alt="" className="w-4 h-4 flex-shrink-0"
               onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[#ccc] truncate">{pageInfo.title}</p>
          <p className="text-[10px] text-[#444] truncate">{pageInfo.url}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-4 py-3 overflow-y-auto">

        {/* Title */}
        <div>
          <label className="text-[10px] font-medium text-[#555] uppercase
                            tracking-wider mb-1.5 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={saveState === 'saving'}
            className="w-full px-3 py-2 bg-[#161616] border border-[#252525]
                       rounded-lg text-sm text-[#e2e2e2] outline-none
                       focus:border-[#4f6ef7] transition-colors disabled:opacity-40"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] font-medium text-[#555] uppercase
                            tracking-wider mb-1.5 block">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* ── ATTACHMENTS ── */}
        <div>
          <label className="text-[10px] font-medium text-[#555] uppercase
                            tracking-wider mb-1.5 block">
            Attachments
            {attachments.length > 0 && (
              <span className="ml-1.5 text-[#4f6ef7] normal-case">
                ({attachments.length})
              </span>
            )}
          </label>

          {/* ── AREA PREVIEW — shown after selection ── */}
          {areaPreview && (
            <div className="mb-3 border border-[#4f6ef7]/40 rounded-xl overflow-hidden
                            bg-[#111]">
              {/* Preview image */}
              <img
                src={areaPreview.dataUrl}
                alt="Selected area"
                className="w-full object-contain max-h-32"
              />

              {/* Confirmation bar */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#1e1e1e]">
                <span className="text-[10px] text-[#666] flex-1">
                  Area selected — looks good?
                </span>
                <button
                  onClick={cancelAreaPreview}
                  className="text-[10px] text-[#555] hover:text-[#999]
                             transition-colors px-2 py-1"
                >
                  Discard
                </button>
                <button
                  onClick={retryAreaSelect}
                  className="text-[10px] text-[#666] hover:text-[#ccc] transition-colors
                             px-2 py-1 border border-[#252525] rounded"
                >
                  Retry
                </button>
                <button
                  onClick={confirmAreaScreenshot}
                  className="text-[10px] text-white bg-[#4f6ef7] hover:bg-[#3b5bf5]
                             transition-colors px-3 py-1 rounded font-medium"
                >
                  Add ✓
                </button>
              </div>
            </div>
          )}

          {/* Existing attachment queue */}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {attachments.map(att => (
                <div key={att.id}
                     className="flex items-center gap-2 p-2 bg-[#111]
                                border border-[#1e1e1e] rounded-lg group">
                  {att.type !== 'text' && att.preview ? (
                    <img src={att.preview} alt=""
                         className="w-10 h-10 object-cover rounded flex-shrink-0
                                    border border-[#252525]" />
                  ) : (
                    <div className="w-10 h-10 bg-[#161616] rounded flex items-center
                                    justify-center flex-shrink-0 text-base">📝</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#ccc] truncate">
                      {att.type === 'text'
                        ? att.content?.slice(0, 40)
                        : att.type === 'area_screenshot'
                          ? 'Area screenshot'
                          : 'Full screenshot'}
                    </p>
                    <p className="text-[9px] text-[#444] capitalize">
                      {att.type.replace('_', ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity
                               text-[#444] hover:text-red-400 p-1 flex-shrink-0"
                    title="Remove"
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

          {/* Text note composer */}
          {addingText && (
            <div className="mb-2">
              <textarea
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.metaKey) addTextNote()
                  if (e.key === 'Escape') {
                    setAddingText(false)
                    setTextInput('')
                  }
                }}
                placeholder="Type a note, quote, or thought..."
                rows={3}
                className="w-full px-3 py-2 bg-[#161616] border border-[#4f6ef7]
                           rounded-lg text-xs text-[#e2e2e2] placeholder-[#444]
                           outline-none resize-none"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] text-[#444] flex-1">⌘↵ to add</span>
                <button
                  onClick={() => { setAddingText(false); setTextInput('') }}
                  className="text-[10px] text-[#555] hover:text-[#999]
                             transition-colors px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={addTextNote}
                  disabled={!textInput.trim()}
                  className="text-[10px] text-white bg-[#4f6ef7] hover:bg-[#3b5bf5]
                             disabled:opacity-40 transition-colors px-3 py-1
                             rounded font-medium"
                >
                  Add note
                </button>
              </div>
            </div>
          )}

          {/* Add attachment buttons — hidden while area preview is showing */}
          {!addingText && !areaPreview && (
            <div className="grid grid-cols-3 gap-1.5">
              <AttachButton
                emoji="📸"
                label="Screenshot"
                onClick={addFullScreenshot}
              />
              <AttachButton
                emoji={selectingArea ? '⏳' : '✂️'}
                label={selectingArea ? 'Selecting...' : 'Select area'}
                onClick={startAreaSelect}
                disabled={selectingArea}
                active={selectingArea}
              />
              <AttachButton
                emoji="📝"
                label="Text note"
                onClick={() => setAddingText(true)}
              />
            </div>
          )}
        </div>

        {saveState === 'error' && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="px-4 pb-4 pt-2 border-t border-[#1e1e1e]">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || !!areaPreview}
          className="w-full py-2.5 bg-[#4f6ef7] hover:bg-[#3b5bf5] disabled:opacity-40
                     text-white text-sm font-medium rounded-lg transition-colors
                     flex items-center justify-center gap-2"
        >
          {saveState === 'saving' ? (
            <>
              <div className="w-3 h-3 border-2 border-white/50 border-t-white
                              rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
              Save to Memex
              {attachments.length > 0 && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  +{attachments.length}
                </span>
              )}
            </>
          )}
        </button>

        {areaPreview && (
          <p className="text-center text-[10px] text-[#444] mt-2">
            Confirm or discard the area selection first
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Small reusable attach button
// ─────────────────────────────────────────────
function AttachButton({
  emoji, label, onClick, disabled, active
}: {
  emoji:    string
  label:    string
  onClick:  () => void
  disabled?: boolean
  active?:   boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg
                  border transition-all disabled:opacity-40
                  ${active
                    ? 'bg-[#1a1f3a] border-[#4f6ef7]/40 text-[#7b93ff]'
                    : 'bg-[#111] border-[#1e1e1e] hover:border-[#252525] hover:bg-[#161616]'
                  }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className={`text-[9px] ${active ? 'text-[#7b93ff]' : 'text-[#666]'}`}>
        {label}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────
function Header({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#4f6ef7] rounded-md flex items-center
                        justify-center text-white font-bold text-xs">M</div>
        <span className="text-sm font-semibold text-[#e2e2e2]">Memex</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
          className="text-[10px] text-[#555] hover:text-[#7b93ff] transition-colors
                     flex items-center gap-1"
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
          className="text-[10px] text-[#444] hover:text-[#999] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
