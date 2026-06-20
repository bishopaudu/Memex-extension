import { useState, KeyboardEvent } from 'react'

interface Props {
  tags:     string[]
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
    <div className="flex flex-wrap gap-1 p-2 bg-[#272f4d] border border-[#3f4d74]
                    rounded-lg min-h-[38px] focus-within:border-[#4f6ef7]
                    transition-colors">
      {tags.map(tag => (
        <span key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1a2550]
                         text-[#93a8fa] text-[10px] rounded">
          {tag}
          <button onClick={() => removeTag(tag)}
                  className="hover:text-white transition-colors leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        className="flex-1 min-w-[80px] text-xs bg-transparent outline-none
                   text-[#f0f0f0] placeholder-[#777777]"
      />
    </div>
  )
}
