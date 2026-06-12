import React from 'react'

/**
 * Lightweight markdown-ish renderer for extracted text / notes.
 * Supports:
 *   # / ## / ### headings
 *   • bullet lines
 *   > quote lines
 *   ``` code fences
 *   bare URLs → clickable links
 *   blank-line separated paragraphs
 */
export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null

  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code fence
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push(
        <pre key={key++} className="text-xs text-green-400 font-mono bg-surface-3
                                     rounded-xl px-4 py-3 my-2 overflow-x-auto">
          {codeLines.join('\n')}
        </pre>
      )
      continue
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/)
    const h2 = line.match(/^##\s+(.*)/)
    const h1 = line.match(/^#\s+(.*)/)
    if (h1) {
      blocks.push(<h1 key={key++} className="text-lg font-bold text-ink-1 mt-4 mb-1">{linkify(h1[1])}</h1>)
      i++; continue
    }
    if (h2) {
      blocks.push(<h2 key={key++} className="text-base font-semibold text-ink-1 mt-3 mb-1">{linkify(h2[1])}</h2>)
      i++; continue
    }
    if (h3) {
      blocks.push(<h3 key={key++} className="text-sm font-semibold text-ink-2 mt-2 mb-1">{linkify(h3[1])}</h3>)
      i++; continue
    }

    // Bullet group
    if (line.trim().startsWith('•') || line.trim().startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].trim().startsWith('•') || lines[i].trim().startsWith('- '))) {
        items.push(lines[i].trim().replace(/^[•-]\s*/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc list-inside text-sm text-ink-1
                                    leading-relaxed space-y-0.5 my-1.5 pl-1">
          {items.map((it, idx) => <li key={idx}>{linkify(it)}</li>)}
        </ul>
      )
      continue
    }

    // Quote
    if (line.trim().startsWith('>')) {
      blocks.push(
        <blockquote key={key++}
          className="text-sm text-ink-2 italic border-l-2 border-brand/40
                     pl-3 py-0.5 my-2">
          {linkify(line.trim().replace(/^>\s*/, ''))}
        </blockquote>
      )
      i++; continue
    }

    // Divider
    if (line.trim() === '─'.repeat(40) || /^─{3,}$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="border-surface-4 my-3" />)
      i++; continue
    }

    // Blank line — skip
    if (line.trim() === '') {
      i++; continue
    }

    // Regular paragraph — accumulate consecutive non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('•') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```')
    ) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="text-sm text-ink-1 leading-relaxed my-1.5">
        {linkify(paraLines.join(' '))}
      </p>
    )
  }

  return <div className={className}>{blocks}</div>
}

/**
 * Turns bare URLs in a string into clickable links,
 * returns an array of React nodes/strings.
 */
function linkify(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s)]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, idx) => {
    if (urlRegex.test(part) && part.startsWith('http')) {
      let display = part
      try {
        const u = new URL(part)
        display = u.hostname.replace('www.', '') + (u.pathname !== '/' ? u.pathname : '')
        if (display.length > 45) display = display.slice(0, 45) + '…'
      } catch {}
      return (
        
          <a key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-bright hover:underline break-all"
          onClick={e => e.stopPropagation()}
        >
          {display}
        </a>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}
