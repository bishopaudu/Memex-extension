import { useState, useEffect } from 'react'
import { bookmarksApi, uploadApi } from '../lib/api'
import { TagInput } from './TagInput'

interface PageInfo {
  url:         string
  title:       string
  description: string
  faviconUrl:  string
  ogImageUrl:  string
}

interface Props {
  onLogout:  () => void
  userEmail: string
}

type SaveState = 'idle' | 'capturing' | 'uploading' | 'saving' | 'saved' | 'error'

const STATE_LABELS: Record<SaveState, string> = {
  idle:      'Save to Memex',
  capturing: 'Capturing screenshot...',
  uploading: 'Uploading screenshot...',
  saving:    'Saving bookmark...',
  saved:     'Saved!',
  error:     'Try again',
}

export function SaveScreen({ onLogout, userEmail }: Props) {
  const [pageInfo,  setPageInfo]  = useState<PageInfo | null>(null)
  const [title,     setTitle]     = useState('')
  const [tags,      setTags]      = useState<string[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  useEffect(() => { getCurrentTabInfo() }, [])

  async function getCurrentTabInfo() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !tab?.id) return
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

    const baseInfo: PageInfo = {
      url:         tab.url,
      title:       tab.title ?? '',
      description: '',
      faviconUrl:  tab.favIconUrl ?? '',
      ogImageUrl:  '',
    }

    setPageInfo(baseInfo)
    setTitle(tab.title ?? '')

    try {
      const metadata = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' })
      if (metadata) {
        setPageInfo({ ...baseInfo, ...metadata })
        setTitle(metadata.title || tab.title || '')
      }
    } catch {
      // Use tab info only — fine
    }
  }

  async function handleSave() {
    if (!pageInfo) return

    setErrorMsg('')
    let screenshotUrl: string | undefined
    let screenshotKey: string | undefined

    // ── Step 1: Capture screenshot ──
    setSaveState('capturing')

    try {
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
        undefined,
        { format: 'png', quality: 90 }
      )

      // ── Step 2: Upload to Cloudinary via our API ──
      setSaveState('uploading')

      const uploadResult = await uploadApi.uploadScreenshot(screenshotDataUrl)

      if (!uploadResult.error) {
        screenshotUrl = uploadResult.data.url
        screenshotKey = uploadResult.data.publicId
      }
      // Upload failure is non-fatal — we still save the bookmark
    } catch (err) {
      // Screenshot capture failed (PDF, restricted page, etc.)
      // Non-fatal — continue without screenshot
      console.warn('[Screenshot] Capture failed:', err)
    }

    // ── Step 3: Save bookmark ──
    setSaveState('saving')

    const result = await bookmarksApi.create({
      url:           pageInfo.url,
      title:         title || pageInfo.title,
      description:   pageInfo.description,
      faviconUrl:    pageInfo.faviconUrl,
      ogImageUrl:    pageInfo.ogImageUrl,
      screenshotUrl,
      screenshotKey,
      tags,
    })

    if (result.error) {
      setSaveState('error')
      setErrorMsg(result.error.message)
      return
    }

    setSaveState('saved')
    setTimeout(() => window.close(), 1200)
  }

  if (!pageInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (saveState === 'saved') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Saved to Memex!</p>
      </div>
    )
  }

  const isBusy = ['capturing', 'uploading', 'saving'].includes(saveState)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">Memex</span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Page preview */}
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        {pageInfo.faviconUrl && (
          <img
            src={pageInfo.faviconUrl}
            alt=""
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate">{pageInfo.title}</p>
          <p className="text-xs text-gray-400 truncate">{pageInfo.url}</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col gap-3 px-4 py-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isBusy}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {isBusy && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent
                            rounded-full animate-spin flex-shrink-0" />
            {STATE_LABELS[saveState]}
          </div>
        )}

        {saveState === 'error' && (
          <p className="text-xs text-red-500">{errorMsg}</p>
        )}
      </div>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSave}
          disabled={isBusy}
          className="w-full py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50
                     text-white text-sm font-medium rounded-lg transition-colors
                     flex items-center justify-center gap-2"
        >
          {isBusy ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent
                              rounded-full animate-spin" />
              {STATE_LABELS[saveState]}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {STATE_LABELS[saveState]}
            </>
          )}
        </button>

        {saveState === 'idle' && (
          <p className="text-center text-xs text-gray-400 mt-2">
            📸 Screenshot captured automatically
          </p>
        )}
      </div>
    </div>
  )
}
