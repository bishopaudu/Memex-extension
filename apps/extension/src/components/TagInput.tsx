import { useState, KeyboardEvent } from 'react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('')

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
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

  return (
    <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-lg
                    min-h-[38px] focus-within:ring-2 focus-within:ring-primary-500
                    focus-within:border-transparent">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5
                                    bg-primary-50 text-primary-700 text-xs rounded-md">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-primary-900 leading-none">
            ×
          </button>
        </span>
      ))}

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags (press Enter)' : ''}
        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent placeholder-gray-400"
      />
    </div>
  )
}
