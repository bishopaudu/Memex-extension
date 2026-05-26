import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, topics, topicBlocks, topicReferences, topicConnections, bookmarks, bookmarkTags, tags, attachments } from '../db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { sql } from 'drizzle-orm'

const topicsRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

topicsRouter.use('*', authMiddleware)

// ─────────────────────────────────────────────
// GET /topics — list all topics
// ─────────────────────────────────────────────
topicsRouter.get('/', async (c) => {
  const userId = c.get('userId')

  const results = await db.query.topics.findMany({
    where: eq(topics.userId, userId),
    with: {
      blocks:     { orderBy: [topicBlocks.order] },
      references: true,
    },
    orderBy: [desc(topics.updatedAt)],
  })

  const items = results.map(t => ({
    id:          t.id,
    title:       t.title,
    emoji:       t.emoji,
    summary:     t.summary,
    coverColor:  t.coverColor,
    isPublic:    t.isPublic,
    blockCount:  t.blocks.length,
    refCount:    t.references.length,
    createdAt:   t.createdAt,
    updatedAt:   t.updatedAt,
  }))

  return c.json({ data: { items }, error: null })
})

// ─────────────────────────────────────────────
// POST /topics — create topic
// ─────────────────────────────────────────────
topicsRouter.post('/', zValidator('json', z.object({
  title:      z.string().min(1).max(200),
  emoji:      z.string().optional().default('📄'),
  summary:    z.string().optional(),
  coverColor: z.string().optional().default('#4f6ef7'),
})), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')

  const [topic] = await db
    .insert(topics)
    .values({ userId, ...input })
    .returning()

  // Create a default empty paragraph block
  await db.insert(topicBlocks).values({
    topicId: topic.id,
    type:    'paragraph',
    content: '',
    order:   'a0',
  })

  return c.json({ data: { topic }, error: null }, 201)
})

// ─────────────────────────────────────────────
// GET /topics/:id — full topic with all data
// ─────────────────────────────────────────────
topicsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const topic = await db.query.topics.findFirst({
    where: and(eq(topics.id, id), eq(topics.userId, userId)),
    with: {
      blocks:      { orderBy: [topicBlocks.order] },
      references:  { with: { bookmark: { with: { bookmarkTags: { with: { tag: true } } } } } },
      connections: { with: { toTopic: true } },
      backlinks:   { with: { fromTopic: true } },
    },
  })

  if (!topic) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
  }

  // Fetch attachments for referenced bookmarks
  const bookmarkIds = topic.references.map(r => r.bookmarkId)
  const allAtts = bookmarkIds.length > 0
    ? await db.select().from(attachments).where(inArray(attachments.bookmarkId, bookmarkIds))
    : []

  const attsByBookmark = allAtts.reduce((acc, att) => {
    if (!acc[att.bookmarkId]) acc[att.bookmarkId] = []
    acc[att.bookmarkId].push(att)
    return acc
  }, {} as Record<string, typeof allAtts>)

  return c.json({
    data: {
      topic: {
        id:          topic.id,
        title:       topic.title,
        emoji:       topic.emoji,
        summary:     topic.summary,
        coverColor:  topic.coverColor,
        isPublic:    topic.isPublic,
        createdAt:   topic.createdAt,
        updatedAt:   topic.updatedAt,
        blocks:      topic.blocks,
        references:  topic.references.map(r => ({
          bookmarkId: r.bookmarkId,
          note:       r.note,
          addedAt:    r.addedAt,
          bookmark: {
            ...r.bookmark,
            tags:        r.bookmark.bookmarkTags.map(bt => bt.tag),
            attachments: attsByBookmark[r.bookmarkId] ?? [],
          },
        })),
        connections: topic.connections.map(c => ({
          topicId: c.toTopicId,
          title:   c.toTopic.title,
          emoji:   c.toTopic.emoji,
          label:   c.label,
        })),
        backlinks: topic.backlinks.map(b => ({
          topicId: b.fromTopicId,
          title:   b.fromTopic.title,
          emoji:   b.fromTopic.emoji,
          label:   b.label,
        })),
      }
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// PATCH /topics/:id — update topic meta
// ─────────────────────────────────────────────
topicsRouter.patch('/:id', zValidator('json', z.object({
  title:      z.string().min(1).max(200).optional(),
  emoji:      z.string().optional(),
  summary:    z.string().optional(),
  coverColor: z.string().optional(),
  isPublic:   z.boolean().optional(),
})), async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const input  = c.req.valid('json')

  const [existing] = await db.select({ id: topics.id }).from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId))).limit(1)

  if (!existing) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
  }

  await db.update(topics)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(topics.id, id))

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /topics/:id
// ─────────────────────────────────────────────
topicsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const result = await db.delete(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId)))
    .returning({ id: topics.id })

  if (!result.length) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
  }

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// PUT /topics/:id/blocks — save all blocks
// We replace all blocks on each save (simpler than diff)
// ─────────────────────────────────────────────
topicsRouter.put('/:id/blocks', zValidator('json', z.object({
  blocks: z.array(z.object({
    id:       z.string().optional(),
    type:     z.string(),
    content:  z.string().optional().default(''),
    metadata: z.string().optional(),
    order:    z.string(),
  }))
})), async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const { blocks: newBlocks } = c.req.valid('json')

  const [existing] = await db.select({ id: topics.id }).from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId))).limit(1)

  if (!existing) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
  }

  await db.transaction(async (tx) => {
    // Delete all existing blocks
    await tx.delete(topicBlocks).where(eq(topicBlocks.topicId, id))

    // Insert new blocks
    if (newBlocks.length > 0) {
      await tx.insert(topicBlocks).values(
        newBlocks.map((b, i) => ({
          id:       b.id ?? undefined,
          topicId:  id,
          type:     b.type,
          content:  b.content ?? '',
          metadata: b.metadata ?? null,
          order:    b.order || String(i).padStart(4, '0'),
        }))
      )
    }

    // Update topic updatedAt
    await tx.update(topics)
      .set({ updatedAt: new Date() })
      .where(eq(topics.id, id))
  })

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// POST /topics/:id/references — add bookmark
// ─────────────────────────────────────────────
topicsRouter.post('/:id/references', zValidator('json', z.object({
  bookmarkId: z.string().uuid(),
  note:       z.string().optional(),
})), async (c) => {
  const userId     = c.get('userId')
  const id         = c.req.param('id')
  const { bookmarkId, note } = c.req.valid('json')

  const [topic] = await db.select({ id: topics.id }).from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId))).limit(1)

  if (!topic) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
  }

  await db.insert(topicReferences)
    .values({ topicId: id, bookmarkId, note: note ?? null })
    .onConflictDoNothing()

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /topics/:id/references/:bookmarkId
// ─────────────────────────────────────────────
topicsRouter.delete('/:id/references/:bookmarkId', async (c) => {
  const userId     = c.get('userId')
  const id         = c.req.param('id')
  const bookmarkId = c.req.param('bookmarkId')

  await db.delete(topicReferences)
    .where(and(
      eq(topicReferences.topicId, id),
      eq(topicReferences.bookmarkId, bookmarkId)
    ))

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// POST /topics/:id/connections — link two topics
// ─────────────────────────────────────────────
topicsRouter.post('/:id/connections', zValidator('json', z.object({
  toTopicId: z.string().uuid(),
  label:     z.string().optional(),
})), async (c) => {
  const userId   = c.get('userId')
  const id       = c.req.param('id')
  const { toTopicId, label } = c.req.valid('json')

  if (id === toTopicId) {
    return c.json({ data: null, error: { code: 'INVALID', message: 'Cannot connect topic to itself' } }, 400)
  }

  await db.insert(topicConnections)
    .values({ fromTopicId: id, toTopicId, label: label ?? null })
    .onConflictDoNothing()

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /topics/:id/connections/:toTopicId
// ─────────────────────────────────────────────
topicsRouter.delete('/:id/connections/:toTopicId', async (c) => {
  const id        = c.req.param('id')
  const toTopicId = c.req.param('toTopicId')

  await db.delete(topicConnections)
    .where(and(
      eq(topicConnections.fromTopicId, id),
      eq(topicConnections.toTopicId, toTopicId)
    ))

  return c.json({ data: { success: true }, error: null })
})

export default topicsRouter

// ─────────────────────────────────────────────
// GET /topics/graph — all topics + connections
// for graph visualization
// ─────────────────────────────────────────────
topicsRouter.get('/graph', async (c) => {
  const userId = c.get('userId')

  const allTopics = await db.query.topics.findMany({
    where: eq(topics.userId, userId),
    with: {
      references:  true,
      connections: true,
    },
  })

  const nodes = allTopics.map(t => ({
    id:         t.id,
    title:      t.title,
    emoji:      t.emoji,
    coverColor: t.coverColor,
    refCount:   t.references.length,
    linkCount:  t.connections.length,
  }))

  const edges: { source: string; target: string; label: string | null }[] = []
  for (const topic of allTopics) {
    for (const conn of topic.connections) {
      edges.push({
        source: topic.id,
        target: conn.toTopicId,
        label:  conn.label,
      })
    }
  }

  return c.json({ data: { nodes, edges }, error: null })
})
