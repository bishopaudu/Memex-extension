import { Hono } from 'hono'
import { db, bookmarks, bookmarkTags, tags, attachments, topics, topicBlocks } from '../db'
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { inArray } from 'drizzle-orm'

const searchRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

searchRouter.use('*', authMiddleware)

// ─────────────────────────────────────────────
// GET /search?q=query
// Returns bookmarks + wiki topics matching query
// ─────────────────────────────────────────────
searchRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const query  = c.req.query('q')?.trim() ?? ''

  if (!query || query.length < 2) {
    return c.json({ data: { bookmarks: [], topics: [] }, error: null })
  }

  // ── Search bookmarks ──
  // Full-text search on title + description + url
  const bookmarkResults = await db.query.bookmarks.findMany({
    where: and(
      eq(bookmarks.userId, userId),
      eq(bookmarks.isArchived, false),
      sql`to_tsvector('english',
        coalesce(${bookmarks.title}, '') || ' ' ||
        coalesce(${bookmarks.description}, '') || ' ' ||
        ${bookmarks.url}
      ) @@ plainto_tsquery('english', ${query})`
    ),
    with: {
      bookmarkTags: { with: { tag: true } },
    },
    orderBy: [desc(bookmarks.createdAt)],
    limit: 10,
  })

  // ── Search wiki topics ──
  // Search in title + summary + block content
  const topicResults = await db.query.topics.findMany({
    where: and(
      eq(topics.userId, userId),
      or(
        sql`to_tsvector('english',
          coalesce(${topics.title}, '') || ' ' ||
          coalesce(${topics.summary}, '')
        ) @@ plainto_tsquery('english', ${query})`,
        // Also search block content via subquery
        sql`${topics.id} IN (
          SELECT DISTINCT tb.topic_id FROM topic_blocks tb
          WHERE to_tsvector('english', coalesce(tb.content, ''))
          @@ plainto_tsquery('english', ${query})
        )`
      )
    ),
    with: {
      blocks:     { orderBy: [topicBlocks.order], limit: 20 },
      references: true,
    },
    orderBy: [desc(topics.updatedAt)],
    limit: 10,
  })

  // Find which blocks matched in each topic
  const topicsWithMatches = topicResults.map(topic => {
    const matchingBlocks = topic.blocks.filter(block =>
      block.content &&
      block.content.toLowerCase().includes(query.toLowerCase())
    )

    // Extract a snippet around the match
    const snippet = matchingBlocks.length > 0
      ? getSnippet(matchingBlocks[0].content ?? '', query)
      : topic.summary ?? ''

    return {
      id:         topic.id,
      title:      topic.title,
      emoji:      topic.emoji,
      coverColor: topic.coverColor,
      summary:    topic.summary,
      snippet,
      refCount:   topic.references.length,
      blockCount: topic.blocks.length,
      updatedAt:  topic.updatedAt,
    }
  })

  const bookmarkItems = bookmarkResults.map(b => ({
    id:            b.id,
    url:           b.url,
    title:         b.title,
    description:   b.description,
    screenshotUrl: b.screenshotUrl,
    faviconUrl:    b.faviconUrl,
    tags:          b.bookmarkTags.map(bt => bt.tag),
    createdAt:     b.createdAt,
    // Highlight the matching snippet
    snippet: getSnippet(
      [b.title, b.description, b.url].filter(Boolean).join(' '),
      query
    ),
  }))

  return c.json({
    data: {
      bookmarks: bookmarkItems,
      topics:    topicsWithMatches,
      query,
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// Extract a text snippet around a search match
// ─────────────────────────────────────────────
function getSnippet(text: string, query: string, radius = 80): string {
  if (!text) return ''
  const lower   = text.toLowerCase()
  const idx     = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, radius * 2) + '...'

  const start   = Math.max(0, idx - radius)
  const end     = Math.min(text.length, idx + query.length + radius)
  const snippet = text.slice(start, end)

  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
}

export default searchRouter
