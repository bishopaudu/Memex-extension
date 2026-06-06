import { useState } from 'react'
import { useToast } from './Toast'

interface Props {
  selectedIds:   string[]
  collections:   { id: string; name: string; icon: string }[]
  onClear:       () => void
  onDelete:      (ids: string[]) => void
  onArchive:     (ids: string[]) => void
  onAddToCollection: (ids: string[], collectionId: string) => void
  onAddTag:      (ids: string[], tag: string) => void
}

export function BulkActionBar({
  selectedIds, collections, onClear,
  onDelete, onArchive, onAddToCollection, onAddTag
}: Props) {
  const [showCollPicker, setShowCollPicker] = useState(false)
  const [showTagInput,   setShowTagInput]   = useState(false)
  const [tagValue,       setTagValue]       = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const { toast } = useToast()

  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
                    flex items-center gap-2 px-4 py-2.5 bg-surface-2
                    border border-surface-4 rounded-2xl shadow-2xl
                    shadow-black/40 backdrop-blur-sm">

      {/* Count */}
      <span className="text-xs font-medium text-ink-1 mr-1">
        {selectedIds.length} selected
      </span>

      <div className="w-px h-4 bg-surface-4" />

      {/* Add to collection */}
      <div className="relative">
        <button
          onClick={() => { setShowCollPicker(!showCollPicker); setShowTagInput(false) }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-2
                     hover:text-ink-1 hover:bg-surface-3 rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          Add to collection
        </button>

        {showCollPicker && (
          <div className="absolute bottom-full mb-2 left-0 w-48 bg-surface-2
                          border border-surface-4 rounded-xl overflow-hidden
                          shadow-xl">
            {collections.length === 0 ? (
              <p className="text-[10px] text-ink-4 p-3 text-center">
                No collections yet
              </p>
            ) : (
              collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => {
                    onAddToCollection(selectedIds, col.id)
                    setShowCollPicker(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left
                             text-xs text-ink-2 hover:bg-surface-3 transition-colors"
                >
                  <span>{col.icon}</span>
                  <span className="truncate">{col.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tag */}
      <div className="relative">
        <button
          onClick={() => { setShowTagInput(!showTagInput); setShowCollPicker(false) }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-2
                     hover:text-ink-1 hover:bg-surface-3 rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          Tag all
        </button>

        {showTagInput && (
          <div className="absolute bottom-full mb-2 left-0 w-44 bg-surface-2
                          border border-surface-4 rounded-xl p-2 shadow-xl">
            <input
              autoFocus
              type="text"
              placeholder="Tag name..."
              value={tagValue}
              onChange={e => setTagValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && tagValue.trim()) {
                  onAddTag(selectedIds, tagValue.trim())
                  setTagValue('')
                  setShowTagInput(false)
                }
                if (e.key === 'Escape') setShowTagInput(false)
              }}
              className="w-full px-2 py-1.5 bg-surface-3 border border-surface-4
                         rounded-lg text-xs text-ink-1 outline-none focus:border-brand
                         placeholder-ink-4"
            />
            <p className="text-[9px] text-ink-5 mt-1 text-center">Enter to apply</p>
          </div>
        )}
      </div>

      {/* Archive */}
      <button
        onClick={() => { onArchive(selectedIds); onClear() }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-2
                   hover:text-ink-1 hover:bg-surface-3 rounded-lg transition-colors"
      >
        <span>📦</span>
        Archive
      </button>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ink-3">Delete {selectedIds.length}?</span>
          <button
            onClick={() => { onDelete(selectedIds); onClear(); setConfirmDelete(false) }}
            className="text-[10px] text-red-400 px-2 py-1 hover:bg-red-400/10 rounded"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[10px] text-ink-3 hover:text-ink-1 px-1"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400
                     hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Delete
        </button>
      )}

      <div className="w-px h-4 bg-surface-4" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="text-[10px] text-ink-4 hover:text-ink-2 transition-colors px-1"
      >
        ✕ Clear
      </button>
    </div>
  )
}
