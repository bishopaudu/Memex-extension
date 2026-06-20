import { useState, useEffect, KeyboardEvent } from 'react'
import { tagsApi } from '../lib/api'

interface ExistingTag {
  id:    string
  name:  string
  count: number
}

interface Props {
  tags:     string[]
  onChange: (tags: string[]) => void
}

export function SmartTagInput({ tags, onChange }: Props) {
  const [input,        setInput]        = useState('')
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    setLoading(true)
    const result = await tagsApi.list()
    if (!result.error) setExistingTags(result.data.items)
    setLoading(false)
  }

  function addTag(value: string) {
    const tag = value.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '')
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  function toggleExistingTag(name: string) {
    if (tags.includes(name)) {
      removeTag(name)
    } else {
      onChange([...tags, name])
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // Filter existing tags by input for suggestions
  const suggestions = input.length > 0
    ? existingTags.filter(t =>
        t.name.includes(input.toLowerCase()) && !tags.includes(t.name)
      ).slice(0, 5)
    : []

  // Unselected existing tags to show as quick-add pills
  const quickTags = existingTags
    .filter(t => !tags.includes(t.name))
    .slice(0, 8)

  return (
    <div className="flex flex-col gap-2">

      {/* Selected tags + text input */}
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#272f4d] border border-[#3f4d74]
                      rounded-lg min-h-[40px] focus-within:border-[#4f6ef7] transition-colors
                      relative">
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#1a2550]
                       text-[#93a8fa] text-[10px] rounded-md font-medium"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="text-[#93a8fa]/60 hover:text-[#93a8fa] transition-colors
                         leading-none ml-0.5 text-xs"
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={tags.length === 0 ? 'Type or pick tags below...' : ''}
          className="flex-1 min-w-[80px] text-[11px] bg-transparent outline-none
                     text-[#f0f0f0] placeholder-[#555555]"
        />

        {/* Inline suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#272f4d]
                          border border-[#3f4d74] rounded-lg overflow-hidden z-10
                          shadow-xl">
            {suggestions.map(tag => (
              <button
                key={tag.id}
                onMouseDown={e => { e.preventDefault(); toggleExistingTag(tag.name) }}
                className="w-full flex items-center justify-between px-3 py-2
                           text-[11px] text-[#f0f0f0] hover:bg-[#313c5e] transition-colors
                           text-left"
              >
                <span>{tag.name}</span>
                <span className="text-[10px] text-[#8888a0]">{tag.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Existing tags as quick-add pills */}
      {!loading && existingTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleExistingTag(tag.name)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md
                         border transition-all
                         bg-[#1f2640] border-[#313c5e] text-[#8888a0]
                         hover:border-[#4f6ef7]/40 hover:text-[#93a8fa]
                         hover:bg-[#1a2550]/30"
            >
              <span className="text-[#8888a0]">#</span>
              {tag.name}
            </button>
          ))}

          {existingTags.filter(t => !tags.includes(t.name)).length > 8 && (
            <span className="text-[10px] text-[#8888a0] flex items-center px-1">
              +{existingTags.filter(t => !tags.includes(t.name)).length - 8} more
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 border border-[#333] border-t-[#555]
                          rounded-full animate-spin" />
          <span className="text-[10px] text-[#8888a0]">Loading your tags...</span>
        </div>
      )}
    </div>
  )
}
