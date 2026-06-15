import { useState } from 'react'

interface ExtractResult {
  type:  'text' | 'images' | 'links' | 'full'
  url:   string
  title: string
  text?:   { content: string; excerpt: string; readingTime: number }
  images?: { src: string; alt: string; width: number; height: number }[]
  links?:  { url: string; text: string; isExternal: boolean }[]
}

interface Attachment {
  id:       string
  type:     'screenshot' | 'area_screenshot' | 'text'
  content?: string
  preview?: string
  status:   'pending' | 'uploading' | 'done' | 'error'
}

interface Props {
  onAdd:   (attachment: Omit<Attachment, 'id' | 'status'>) => void
  onClose: () => void
}

const EXTRACT_TYPES = [
  {
    key:         'text' as const,
    emoji:       '📝',
    label:       'Article text',
    description: 'Main readable content stripped of ads and navigation',
    color:       '#4f6ef7',
  },
  {
    key:         'images' as const,
    emoji:       '🖼️',
    label:       'Images',
    description: 'All significant images found on this page',
    color:       '#10b981',
  },
  {
    key:         'links' as const,
    emoji:       '🔗',
    label:       'Links',
    description: 'All hyperlinks with titles (internal and external)',
    color:       '#f59e0b',
  },
  {
    key:         'full' as const,
    emoji:       '📋',
    label:       'Full extract',
    description: 'Text + images + links combined',
    color:       '#8b5cf6',
  },
]

export function ExtractPanel({ onAdd, onClose }: Props) {
  const [extracting, setExtracting] = useState<string | null>(null)
  const [done,       setDone]       = useState<string[]>([])
  const [error,      setError]      = useState<string | null>(null)

  async function handleExtract(type: 'text' | 'images' | 'links' | 'full') {
    setExtracting(type)
    setError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab')

      const result: ExtractResult = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT',
        extractType: type,
      })

      // Convert extraction result to text attachment(s)
      const attachments: Omit<Attachment, 'id' | 'status'>[] = []

      if (result.text) {
        const meta = `📝 Article text · ${result.text.readingTime} min read\n\n`
        attachments.push({
          type:    'text',
          content: meta + result.text.content,
        })
      }

      if (result.images && result.images.length > 0) {
        const lines = result.images.map((img, i) =>
          `${i + 1}. ${img.alt || 'Image'}\n   ${img.src}${img.width ? ` (${img.width}×${img.height})` : ''}`
        ).join('\n\n')

        attachments.push({
          type:    'text',
          content: `🖼️ Images extracted (${result.images.length})\n\n${lines}`,
        })
      }

      if (result.links && result.links.length > 0) {
        const internal = result.links.filter(l => !l.isExternal)
        const external = result.links.filter(l =>  l.isExternal)

        let content = `🔗 Links extracted (${result.links.length})\n`
        if (external.length > 0) {
          content += `\n🌐 External links (${external.length}):\n`
          content += external.slice(0, 20).map(l => `• ${l.text}\n  ${l.url}`).join('\n\n')
        }
        if (internal.length > 0) {
          content += `\n\n🏠 Internal links (${internal.length}):\n`
          content += internal.slice(0, 20).map(l => `• ${l.text}\n  ${l.url}`).join('\n\n')
        }

        attachments.push({ type: 'text', content })
      }

      // Add all attachments
      attachments.forEach(att => onAdd(att))
      setDone(prev => [...prev, type])

    } catch (err) {
      console.error('Extraction failed:', err)
      setError('Extraction failed — some pages restrict content access')
    }

    setExtracting(null)
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5
                      border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <span className="text-sm">📰</span>
          <span className="text-[11px] font-medium text-[#ccc]">
            Extract from page
          </span>
        </div>
        <button onClick={onClose}
                className="text-[#888888] hover:text-[#999] transition-colors text-sm">
          ×
        </button>
      </div>

      {/* Extraction type buttons */}
      <div className="p-2 flex flex-col gap-1.5">
        {EXTRACT_TYPES.map(ext => {
          const isDone      = done.includes(ext.key)
          const isExtracting = extracting === ext.key

          return (
            <button
              key={ext.key}
              onClick={() => !isDone && !extracting && handleExtract(ext.key)}
              disabled={!!extracting || isDone}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                         transition-all group"
              style={{
                background: isDone
                  ? ext.color + '12'
                  : isExtracting
                    ? ext.color + '18'
                    : '#161616',
                border: `0.5px solid ${
                  isDone || isExtracting ? ext.color + '40' : '#1e1e1e'
                }`,
                opacity: extracting && !isExtracting ? 0.4 : 1,
              }}
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center
                              flex-shrink-0 text-base transition-transform
                              group-hover:scale-110"
                   style={{ background: ext.color + '20' }}>
                {isExtracting ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full
                                  animate-spin"
                       style={{ borderColor: ext.color + '60',
                                borderTopColor: ext.color }} />
                ) : isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                       stroke={ext.color} strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <span>{ext.emoji}</span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate"
                   style={{ color: isDone ? ext.color : '#ccc' }}>
                  {isDone ? `${ext.label} extracted ✓` : ext.label}
                </p>
                <p className="text-[9px] truncate" style={{ color: '#444' }}>
                  {isExtracting ? 'Extracting...' : ext.description}
                </p>
              </div>

              {/* Arrow */}
              {!isDone && !isExtracting && (
                <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-0
                                group-hover:opacity-100 transition-opacity"
                     fill="none" viewBox="0 0 24 24"
                     stroke={ext.color} strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-2 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20
                        rounded-lg">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Done summary */}
      {done.length > 0 && (
        <div className="mx-2 mb-2 px-3 py-2 bg-[#161616] border border-[#1e1e1e]
                        rounded-lg">
          <p className="text-[10px] text-[#999999]">
            {done.length} extraction{done.length > 1 ? 's' : ''} added to attachments
          </p>
        </div>
      )}
    </div>
  )
}
