import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
  id:         string
  type:       string
  content:    string | null
  url:        string | null
  label:      string | null
  sortOrder:  number
  createdAt:  string
}

interface Props {
  attachments:   Attachment[]
  onLightbox?:   (url: string) => void
  onDelete?:     (id: string) => void
}

// ─────────────────────────────────────────────
// Main board component
// ─────────────────────────────────────────────
export function AttachmentBoard({ attachments: initial, onLightbox, onDelete }: Props) {
  const { toast } = useToast()

  const [items,      setItems]      = useState<Attachment[]>(
    [...initial].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  )
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // must drag 8px before activating
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)

    // Optimistic update
    setItems(newItems)

    // Persist to backend
    setSaving(true)
    const r = await attachmentsApi.reorder(
      newItems.map((item, idx) => ({ id: item.id, sortOrder: idx }))
    )
    setSaving(false)

    if (r.error) {
      toast('Failed to save order', 'error')
      setItems(items) // revert
    }
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    onDelete?.(id)
  }

  function handleContentUpdate(id: string, content: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, content } : i))
  }

  const activeItem = items.find(i => i.id === activeId)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center
                      border border-dashed border-surface-5 rounded-2xl">
        <span className="text-4xl mb-3">📎</span>
        <p className="text-sm font-medium text-ink-2 mb-1">No attachments yet</p>
        <p className="text-xs text-ink-4 max-w-xs">
          Use the Memex extension to add screenshots, notes, or extracted content
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {saving && (
        <div className="absolute top-0 right-0 flex items-center gap-1.5
                        text-[10px] text-ink-4 bg-surface-2 px-2 py-1
                        rounded-lg border border-surface-4 z-10">
          <div className="w-2.5 h-2.5 border border-ink-4 border-t-transparent
                          rounded-full animate-spin" />
          Saving order...
        </div>
      )}

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
              <SortableCard
                key={att.id}
                att={att}
                index={idx}
                onLightbox={onLightbox}
                onDelete={handleDelete}
                onContentUpdate={handleContentUpdate}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay — shows ghost while dragging */}
        <DragOverlay>
          {activeItem && (
            <div className="opacity-90 rotate-1 scale-[1.02]">
              <CardShell att={activeItem} isDragging>
                <p className="text-xs text-ink-3 p-4">Moving...</p>
              </CardShell>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sortable wrapper around each card
// ─────────────────────────────────────────────
function SortableCard({
  att, index, onLightbox, onDelete, onContentUpdate
}: {
  att:             Attachment
  index:           number
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
    isDragging,
  } = useSortable({ id: att.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {att.type === 'screenshot' || att.type === 'area_screenshot' ? (
        <ImageCard
          att={att}
          dragHandleProps={{ ...attributes, ...listeners }}
          onLightbox={onLightbox}
          onDelete={onDelete}
        />
      ) : att.type === 'text' ? (
        <NoteCard
          att={att}
          index={index}
          dragHandleProps={{ ...attributes, ...listeners }}
          onDelete={onDelete}
          onContentUpdate={onContentUpdate}
        />
      ) : (
        <ImageCard
          att={att}
          dragHandleProps={{ ...attributes, ...listeners }}
          onLightbox={onLightbox}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Shared card shell with drag handle
// ─────────────────────────────────────────────
function CardShell({
  att,
  isDragging = false,
  dragHandleProps,
  onDelete,
  children,
  accentColor = '#4f6ef7',
}: {
  att:               Attachment
  isDragging?:       boolean
  dragHandleProps?:  any
  onDelete?:         (id: string) => void
  children:          React.ReactNode
  accentColor?:      string
}) {
  return (
    <div className={`group bg-surface-2 border border-surface-4 rounded-2xl
                     overflow-hidden transition-all
                     ${isDragging ? 'shadow-2xl shadow-black/40' : 'hover:border-surface-5'}`}>
      {/* Top accent bar */}
      <div className="h-0.5" style={{ background: accentColor }} />

      {/* Card header with drag handle */}
      <div className="flex items-center justify-between px-3 py-2
                      border-b border-surface-4">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="flex items-center gap-1.5 text-ink-5 hover:text-ink-3
                     transition-colors cursor-grab active:cursor-grabbing
                     touch-none select-none"
          title="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <line x1="8"  y1="6"  x2="21" y2="6"/>
            <line x1="8"  y1="12" x2="21" y2="12"/>
            <line x1="8"  y1="18" x2="21" y2="18"/>
            <line x1="3"  y1="6"  x2="3.01" y2="6"/>
            <line x1="3"  y1="12" x2="3.01" y2="12"/>
            <line x1="3"  y1="18" x2="3.01" y2="18"/>
          </svg>
          <span className="text-[9px] uppercase tracking-wider">
            {att.type === 'screenshot'      ? 'Screenshot'      :
             att.type === 'area_screenshot' ? 'Area screenshot' :
             att.type === 'text'            ? 'Note'            : 'Image'}
          </span>
        </button>

        {/* Delete */}
        {onDelete && (
          <button
            onClick={() => onDelete(att.id)}
            className="opacity-0 group-hover:opacity-100 text-ink-5
                       hover:text-red-400 transition-all w-5 h-5 flex
                       items-center justify-center rounded"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Image card (screenshot / area_screenshot)
// ─────────────────────────────────────────────
function ImageCard({ att, dragHandleProps, onLightbox, onDelete }: {
  att:              Attachment
  dragHandleProps?: any
  onLightbox?:      (url: string) => void
  onDelete?:        (id: string) => void
}) {
  const isArea  = att.type === 'area_screenshot'
  const accent  = isArea ? '#10b981' : '#4f6ef7'

  return (
    <CardShell
      att={att}
      dragHandleProps={dragHandleProps}
      onDelete={onDelete}
      accentColor={accent}
    >
      {att.url ? (
        <div
          className={`relative overflow-hidden bg-surface-3
                      ${onLightbox ? 'cursor-zoom-in' : ''}`}
          onClick={() => att.url && onLightbox?.(att.url)}
        >
          <img
            src={att.url}
            alt={att.label ?? att.type}
            className="w-full object-contain max-h-96
                       hover:scale-[1.01] transition-transform duration-200"
            onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
          />
          {isArea && (
            <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5
                             bg-black/60 text-white rounded-full">
              ✂️ Area crop
            </span>
          )}
          {onLightbox && (
            <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                             text-[9px] px-2 py-0.5 bg-black/60 text-white
                             rounded-full transition-opacity">
              🔍 Click to expand
            </span>
          )}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-ink-4 text-xs">
          Image unavailable
        </div>
      )}
      {att.label && (
        <p className="px-3 py-2 text-[11px] text-ink-3">{att.label}</p>
      )}
    </CardShell>
  )
}

// ─────────────────────────────────────────────
// Note card (text / extracted text)
// ─────────────────────────────────────────────
function NoteCard({ att, index, dragHandleProps, onDelete, onContentUpdate }: {
  att:              Attachment
  index:            number
  dragHandleProps?: any
  onDelete?:        (id: string) => void
  onContentUpdate:  (id: string, content: string) => void
}) {
  const { toast }  = useToast()
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(att.content ?? '')
  const [content,  setContent]  = useState(att.content ?? '')
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  const firstLine   = content.split('\n')[0] ?? ''
  const isExtracted = firstLine.startsWith('📝') || firstLine.startsWith('🖼️') || firstLine.startsWith('🔗')
  const isLong      = content.length > 600

  const accentColor = firstLine.startsWith('📝') ? '#4f6ef7'
    : firstLine.startsWith('🖼️') ? '#10b981'
    : firstLine.startsWith('🔗') ? '#f59e0b'
    : '#8b5cf6'

  const typeLabel = firstLine.startsWith('📝') ? 'Article text'
    : firstLine.startsWith('🖼️') ? 'Extracted images'
    : firstLine.startsWith('🔗') ? 'Extracted links'
    : `Note ${index + 1}`

  async function saveEdit() {
    setSaving(true)
    const r = await attachmentsApi.update(att.id, draft)
    if (!r.error) {
      setContent(draft)
      onContentUpdate(att.id, draft)
      setEditing(false)
      toast('Note saved', 'success')
    } else {
      toast('Failed to save', 'error')
    }
    setSaving(false)
  }

  const displayed = isLong && !expanded && !editing
    ? content.slice(0, 600) + '...'
    : content

  return (
    <CardShell
      att={att}
      dragHandleProps={dragHandleProps}
      onDelete={onDelete}
      accentColor={accentColor}
    >
      {/* Note header actions */}
      <div className="flex items-center justify-between px-3 py-1.5
                      border-b border-surface-4 bg-surface-3/30">
        <span className="text-[10px] text-ink-4">{typeLabel}</span>
        <div className="flex items-center gap-2">
          {isLong && !editing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] text-ink-4 hover:text-ink-2 transition-colors"
            >
              {expanded ? '↑ Less' : '↓ More'}
            </button>
          )}
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setDraft(content) }}
                className="text-[9px] text-ink-4 hover:text-ink-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-[9px] text-white bg-brand px-2 py-0.5
                           rounded hover:bg-brand/90 disabled:opacity-40
                           transition-colors"
              >
                {saving ? '...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setDraft(content); setEditing(true); setExpanded(true) }}
              className="text-[9px] text-ink-4 hover:text-ink-2 transition-colors
                         flex items-center gap-1"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        <div className="w-0.5 flex-shrink-0" style={{ background: accentColor + '50' }} />
        <div className="flex-1 px-4 py-4 min-w-0">
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={Math.min(24, Math.max(6, draft.split('\n').length + 2))}
              className="w-full bg-surface-3 border border-surface-4 rounded-lg
                         px-3 py-2 text-sm text-ink-1 font-mono leading-relaxed
                         outline-none focus:border-brand transition-colors resize-y"
            />
          ) : (
            <FormattedText text={displayed} />
          )}
        </div>
      </div>
    </CardShell>
  )
}
