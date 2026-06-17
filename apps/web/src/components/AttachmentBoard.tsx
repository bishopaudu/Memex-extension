import { useState, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { attachmentsApi } from '../lib/api'
import { FormattedText } from '../lib/textFormat'
import { useToast } from './Toast'

interface Attachment {
  id:        string
  type:      string
  content:   string | null
  url:       string | null
  label:     string | null
  sortOrder: number
  createdAt: string
}

interface Props {
  attachments: Attachment[]
  onLightbox?: (url: string) => void
  onDelete?:   (id: string) => void
}

// ─────────────────────────────────────────────
// Main board
// ─────────────────────────────────────────────
export function AttachmentBoard({ attachments: initial, onLightbox, onDelete }: Props) {
  const { toast } = useToast()

  const [items,    setItems]    = useState<Attachment[]>(
    [...initial].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const saveTimer  = useRef<any>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    // Debounced save — wait 600ms then persist
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const r = await attachmentsApi.reorder(
        newItems.map((item, idx) => ({ id: item.id, sortOrder: idx }))
      )
      setSaving(false)
      if (r.error) {
        toast('Could not save order', 'error')
        setItems(items) // revert on failure
      }
    }, 600)
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    onDelete?.(id)
  }

  function handleContentUpdate(id: string, content: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, content } : i))
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) : null

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center
                      border-2 border-dashed border-surface-4 rounded-2xl">
        <span className="text-5xl mb-4">📎</span>
        <p className="text-sm font-medium text-ink-2 mb-1">No attachments yet</p>
        <p className="text-xs text-ink-4 max-w-xs leading-relaxed">
          Use the Memex extension to capture screenshots,
          add notes, or extract page content
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Save indicator */}
      <div className={`flex items-center justify-end gap-2 mb-3 h-5
                       transition-opacity duration-200
                       ${saving ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-3 h-3 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
        <span className="text-[10px] text-ink-4">Saving order…</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {items.map((att, idx) => (
              <SortableAttachmentCard
                key={att.id}
                att={att}
                index={idx}
                isDragging={att.id === activeId}
                onLightbox={onLightbox}
                onDelete={handleDelete}
                onContentUpdate={handleContentUpdate}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeItem && (
            <OverlayCard att={activeItem} />
          )}
        </DragOverlay>
      </DndContext>

      {/* Hint */}
      <p className="text-[10px] text-ink-5 text-center mt-4">
        ⠿ Drag cards to reorder
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Drag overlay — shown while dragging
// ─────────────────────────────────────────────
function OverlayCard({ att }: { att: Attachment }) {
  const color = cardAccentColor(att)
  return (
    <div className="bg-surface-2 border-2 rounded-2xl overflow-hidden
                    shadow-2xl shadow-black/50 rotate-1"
         style={{ borderColor: color + '60' }}>
      <div className="h-0.5" style={{ background: color }} />
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="text-base">{cardEmoji(att)}</span>
        <span className="text-xs font-medium text-ink-2">
          {cardLabel(att)}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sortable card wrapper
// ─────────────────────────────────────────────
function SortableAttachmentCard({
  att, index, isDragging, onLightbox, onDelete, onContentUpdate
}: {
  att:             Attachment
  index:           number
  isDragging:      boolean
  onLightbox?:     (url: string) => void
  onDelete?:       (id: string) => void
  onContentUpdate: (id: string, content: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
  } = useSortable({ id: att.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  }

  const isImage = att.type === 'screenshot' || att.type === 'area_screenshot'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-opacity duration-150
                  ${isDragging ? 'opacity-0' : 'opacity-100'}`}
    >
      {isImage ? (
        <ImageCard
          att={att}
          isOver={isOver}
          dragProps={{ ...attributes, ...listeners }}
          onLightbox={onLightbox}
          onDelete={onDelete}
        />
      ) : (
        <NoteCard
          att={att}
          index={index}
          isOver={isOver}
          dragProps={{ ...attributes, ...listeners }}
          onDelete={onDelete}
          onContentUpdate={onContentUpdate}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Shared drag handle button
// ─────────────────────────────────────────────
function DragHandle({ dragProps, isOver }: { dragProps: any; isOver: boolean }) {
  return (
    <button
      {...dragProps}
      className={`flex flex-col gap-[3px] p-2 rounded-lg transition-all
                  cursor-grab active:cursor-grabbing touch-none select-none
                  ${isOver
                    ? 'text-brand-bright bg-brand/10'
                    : 'text-ink-5 hover:text-ink-3 hover:bg-surface-3'}`}
      title="Drag to reorder"
    >
      {[0,1,2].map(i => (
        <div key={i} className="flex gap-[3px]">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
        </div>
      ))}
    </button>
  )
}

// ─────────────────────────────────────────────
// Image / Screenshot card
// ─────────────────────────────────────────────
function ImageCard({ att, isOver, dragProps, onLightbox, onDelete }: {
  att:         Attachment
  isOver:      boolean
  dragProps:   any
  onLightbox?: (url: string) => void
  onDelete?:   (id: string) => void
}) {
  const isArea   = att.type === 'area_screenshot'
  const accent   = isArea ? '#10b981' : '#4f6ef7'

  return (
    <div className={`group bg-surface-2 border rounded-2xl overflow-hidden
                     transition-all duration-150
                     ${isOver
                       ? 'border-brand/50 shadow-lg shadow-brand/10'
                       : 'border-surface-4 hover:border-surface-5'}`}>
      <div className="h-0.5" style={{ background: accent }} />

      {/* Header */}
      <div className="flex items-center justify-between pl-1 pr-3 py-1.5
                      border-b border-surface-4">
        <div className="flex items-center gap-1">
          <DragHandle dragProps={dragProps} isOver={isOver} />
          <span className="text-[10px] text-ink-4">
            {isArea ? '✂️ Area screenshot' : '📸 Screenshot'}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(att.id)}
            className="opacity-0 group-hover:opacity-100 text-ink-5
                       hover:text-red-400 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6"  y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Image */}
      {att.url && (
        <div
          onClick={() => onLightbox?.(att.url!)}
          className={`relative bg-surface-3 overflow-hidden
                      ${onLightbox ? 'cursor-zoom-in' : ''}`}
        >
          <img
            src={att.url}
            alt=""
            className="w-full object-contain max-h-[420px]
                       transition-transform duration-300 group-hover:scale-[1.01]"
            onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
          />
          {onLightbox && (
            <div className="absolute inset-0 flex items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity
                            bg-black/20">
              <div className="bg-black/60 text-white text-xs px-3 py-1.5
                              rounded-full backdrop-blur-sm">
                🔍 Click to expand
              </div>
            </div>
          )}
        </div>
      )}

      {att.label && (
        <p className="px-4 py-2 text-[11px] text-ink-3 italic">{att.label}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Note / Text card
// ─────────────────────────────────────────────
function NoteCard({ att, index, isOver, dragProps, onDelete, onContentUpdate }: {
  att:             Attachment
  index:           number
  isOver:          boolean
  dragProps:       any
  onDelete?:       (id: string) => void
  onContentUpdate: (id: string, content: string) => void
}) {
  const { toast }  = useToast()
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(att.content ?? '')
  const [content,  setContent]  = useState(att.content ?? '')
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const firstLine   = content.split('\n')[0] ?? ''
  const isLong      = content.length > 500
  const accent      = cardAccentColor(att)
  const label       = cardLabel(att, index)

  async function save() {
    setSaving(true)
    const r = await attachmentsApi.update(att.id, draft)
    if (!r.error) {
      setContent(draft)
      onContentUpdate(att.id, draft)
      setEditing(false)
      toast('Saved', 'success')
    } else {
      toast('Failed to save', 'error')
    }
    setSaving(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayed = isLong && !expanded && !editing
    ? content.slice(0, 500) + '…'
    : content

  return (
    <div className={`group bg-surface-2 border rounded-2xl overflow-hidden
                     transition-all duration-150
                     ${isOver
                       ? 'border-brand/50 shadow-lg shadow-brand/10'
                       : 'border-surface-4 hover:border-surface-5'}`}>
      <div className="h-0.5" style={{ background: accent }} />

      {/* Header */}
      <div className="flex items-center justify-between pl-1 pr-3 py-1.5
                      border-b border-surface-4">
        <div className="flex items-center gap-1">
          <DragHandle dragProps={dragProps} isOver={isOver} />
          <span className="text-[10px] text-ink-4">{label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isLong && !editing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] text-ink-5 hover:text-ink-3 transition-colors px-1.5"
            >
              {expanded ? '↑ less' : '↓ more'}
            </button>
          )}

          {/* Copy */}
          <button
            onClick={copy}
            className="text-[9px] text-ink-5 hover:text-ink-3 transition-colors
                       flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-3"
          >
            {copied ? (
              <span className="text-green-400">✓ Copied</span>
            ) : (
              <>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>

          {/* Edit / Save / Cancel */}
          {editing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditing(false); setDraft(content) }}
                className="text-[9px] text-ink-4 hover:text-ink-2 px-2 py-0.5
                           rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-[9px] text-white bg-brand px-2.5 py-0.5
                           rounded-lg hover:bg-brand/90 disabled:opacity-40
                           transition-colors"
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(content); setEditing(true); setExpanded(true) }}
              className="text-[9px] text-ink-5 hover:text-ink-3 transition-colors
                         flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-3"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => onDelete(att.id)}
              className="opacity-0 group-hover:opacity-100 text-ink-5
                         hover:text-red-400 transition-all ml-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6"  y2="18"/>
                <line x1="6"  y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Left accent bar + content */}
      <div className="flex">
        <div className="w-0.5 flex-shrink-0 my-3 ml-3 rounded-full"
             style={{ background: accent + '60' }} />
        <div className="flex-1 px-4 py-3 min-w-0">
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={Math.min(30, Math.max(5, draft.split('\n').length + 2))}
              className="w-full bg-surface-3 border border-surface-4 rounded-xl
                         px-3 py-2.5 text-sm text-ink-1 font-mono leading-relaxed
                         outline-none focus:border-brand transition-colors resize-y"
              placeholder="Write your note here…"
            />
          ) : (
            <FormattedText text={displayed} className="text-sm" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function cardAccentColor(att: Attachment): string {
  const first = att.content?.split('\n')[0] ?? ''
  if (att.type === 'area_screenshot') return '#10b981'
  if (att.type === 'screenshot')      return '#4f6ef7'
  if (first.startsWith('📝'))         return '#4f6ef7'
  if (first.startsWith('🖼️'))         return '#10b981'
  if (first.startsWith('🔗'))         return '#f59e0b'
  return '#8b5cf6'
}

function cardEmoji(att: Attachment): string {
  const first = att.content?.split('\n')[0] ?? ''
  if (att.type === 'screenshot')      return '📸'
  if (att.type === 'area_screenshot') return '✂️'
  if (first.startsWith('📝'))         return '📝'
  if (first.startsWith('🖼️'))         return '🖼️'
  if (first.startsWith('🔗'))         return '🔗'
  return '📝'
}

function cardLabel(att: Attachment, index?: number): string {
  const first = att.content?.split('\n')[0] ?? ''
  if (att.type === 'screenshot')      return 'Screenshot'
  if (att.type === 'area_screenshot') return 'Area screenshot'
  if (first.startsWith('📝'))         return 'Article text'
  if (first.startsWith('🖼️'))         return 'Extracted images'
  if (first.startsWith('🔗'))         return 'Extracted links'
  return `Note ${(index ?? 0) + 1}`
}
