import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, bookmarks, tags, bookmarkTags, attachments, bookmarkCollections } from '../db'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { generateTags, generateSummary, enhanceSearchQuery } from '../lib/ai'

const bookmarksRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

bookmarksRouter.use('*', authMiddleware)

const optionalUrl = z.string()
  .transform(v => v === '' ? null : v)
  .nullable()
  .optional()

const createBookmarkSchema = z.object({
  url:           z.string().url(),
  title:         z.string().optional(),
  description:   z.string().optional(),
  faviconUrl:    optionalUrl,
  ogImageUrl:    optionalUrl,
  screenshotUrl: optionalUrl,
  screenshotKey: z.string().optional(),
  tags:          z.array(z.string()).optional().default([]),
})

const updateBookmarkSchema = z.object({
  title:       z.string().optional(),
  description: z.string().optional(),
  isArchived:  z.boolean().optional(),
  tags:        z.array(z.string()).optional(),
})

// ─────────────────────────────────────────────
// GET /bookmarks
// ─────────────────────────────────────────────
bookmarksRouter.get('/', async (c) => {
  const userId       = c.get('userId')
  let   search       = c.req.query('search') ?? ''
  const tagFilter    = c.req.query('tag')    ?? ''
  const page         = parseInt(c.req.query('page')  ?? '1')
  const limit        = Math.min(parseInt(c.req.query('limit') ?? '20'), 100)
  const offset       = (page - 1) * limit

  const collectionId = c.req.query('collectionId') ?? ''

  if (search.length > 10 && search.includes(' ')) {
    search = await enhanceSearchQuery(search)
  }

  // If filtering by collection, get bookmark IDs first
  let collectionBookmarkIds: string[] = []
  if (collectionId) {
    const rows = await db
      .select({ bookmarkId: bookmarkCollections.bookmarkId })
      .from(bookmarkCollections)
      .where(eq(bookmarkCollections.collectionId, collectionId))
    collectionBookmarkIds = rows.map(r => r.bookmarkId)

    // No bookmarks in collection — return early
    if (collectionBookmarkIds.length === 0) {
      return c.json({ data: { items: [], page, limit }, error: null })
    }
  }

  // Step 1: fetch bookmarks with tags
  const results = await db.query.bookmarks.findMany({
    where: and(
      eq(bookmarks.userId, userId),
      eq(bookmarks.isArchived, false),
      collectionId && collectionBookmarkIds.length > 0
        ? inArray(bookmarks.id, collectionBookmarkIds)
        : undefined,
      search
        ? sql`to_tsvector('english',
            coalesce(${bookmarks.title}, '') || ' ' ||
            coalesce(${bookmarks.description}, '') || ' ' ||
            ${bookmarks.url}
          ) @@ plainto_tsquery('english', ${search})`
        : undefined,
    ),
    with: {
      bookmarkTags: { with: { tag: true } },
    },
    orderBy: [desc(bookmarks.createdAt)],
    limit,
    offset,
  })

  if (results.length === 0) {
    return c.json({ data: { items: [], page, limit }, error: null })
  }

  // Step 2: fetch attachments separately for all bookmarks
  // This is more reliable than relying on Drizzle relations
  const bookmarkIds = results.map(b => b.id)

  const allAttachments = await db
    .select()
    .from(attachments)
    .where(
      sql`${attachments.bookmarkId} = ANY(ARRAY[${sql.join(
        bookmarkIds.map(id => sql`${id}::uuid`),
        sql`, `
      )}])`
    )

  // Group attachments by bookmarkId for fast lookup
  const attachmentsByBookmark = allAttachments.reduce((acc, att) => {
    if (!acc[att.bookmarkId]) acc[att.bookmarkId] = []
    acc[att.bookmarkId].push(att)
    return acc
  }, {} as Record<string, typeof allAttachments>)

  const items = results.map(b => ({
    id:            b.id,
    url:           b.url,
    title:         b.title,
    description:   b.description,
    screenshotUrl: b.screenshotUrl,
    faviconUrl:    b.faviconUrl,
    ogImageUrl:    b.ogImageUrl,
    isArchived:    b.isArchived,
    tags:          b.bookmarkTags.map(bt => bt.tag),
    attachments:   attachmentsByBookmark[b.id] ?? [],
    createdAt:     b.createdAt,
    updatedAt:     b.updatedAt,
  }))

  return c.json({ data: { items, page, limit }, error: null })
})

// ─────────────────────────────────────────────
// POST /bookmarks
// ─────────────────────────────────────────────
bookmarksRouter.post('/', zValidator('json', createBookmarkSchema), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')

  const [aiTags, aiSummary] = await Promise.all([
    generateTags({
      url:         input.url,
      title:       input.title       ?? '',
      description: input.description ?? '',
    }),
    generateSummary({
      url:         input.url,
      title:       input.title       ?? '',
      description: input.description ?? '',
    }),
  ])

  const userTags       = input.tags ?? []
  const allTags        = [...new Set([...userTags, ...aiTags])]
  const finalDesc      = input.description || aiSummary || null

  const bookmark = await db.transaction(async (tx) => {
    const [newBookmark] = await tx
      .insert(bookmarks)
      .values({
        userId,
        url:           input.url,
        title:         input.title         ?? null,
        description:   finalDesc,
        faviconUrl:    input.faviconUrl    ?? null,
        ogImageUrl:    input.ogImageUrl    ?? null,
        screenshotUrl: input.screenshotUrl ?? null,
        screenshotKey: input.screenshotKey ?? null,
      })
      .returning()

    for (const tagName of allTags) {
      const clean = tagName.toLowerCase().trim().replace(/[^a-z0-9\-\s]/g, '')
      if (!clean) continue

      const [tag] = await tx
        .insert(tags)
        .values({ userId, name: clean })
        .onConflictDoNothing()
        .returning({ id: tags.id })

      let tagId = tag?.id
      if (!tagId) {
        const [existing] = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, userId), eq(tags.name, clean)))
          .limit(1)
        tagId = existing?.id
      }

      if (tagId) {
        await tx
          .insert(bookmarkTags)
          .values({ bookmarkId: newBookmark.id, tagId })
          .onConflictDoNothing()
      }
    }

    return newBookmark
  })

  return c.json({ data: { bookmark, aiTags, aiSummary }, error: null }, 201)
})

// ─────────────────────────────────────────────
// GET /bookmarks/:id  — includes attachments
// ─────────────────────────────────────────────
bookmarksRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const bookmark = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)),
    with:  { bookmarkTags: { with: { tag: true } } },
  })

  if (!bookmark) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Bookmark not found' }
    }, 404)
  }

  // Fetch attachments separately — always reliable
  const bookmarkAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.bookmarkId, id))

  return c.json({
    data: {
      bookmark: {
        ...bookmark,
        tags:        bookmark.bookmarkTags.map(bt => bt.tag),
        attachments: bookmarkAttachments,
      }
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// PATCH /bookmarks/:id
// ─────────────────────────────────────────────
bookmarksRouter.patch('/:id', zValidator('json', updateBookmarkSchema), async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const input  = c.req.valid('json')

  const [existing] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Bookmark not found' }
    }, 404)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(bookmarks)
      .set({
        ...(input.title       !== undefined && { title:       input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isArchived  !== undefined && { isArchived:  input.isArchived }),
        updatedAt: new Date(),
      })
      .where(eq(bookmarks.id, id))

    if (input.tags !== undefined) {
      await tx.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, id))

      for (const tagName of input.tags) {
        const clean = tagName.toLowerCase().trim()
        if (!clean) continue

        const [tag] = await tx
          .insert(tags)
          .values({ userId, name: clean })
          .onConflictDoNothing()
          .returning({ id: tags.id })

        let tagId = tag?.id
        if (!tagId) {
          const [ex] = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.userId, userId), eq(tags.name, clean)))
          tagId = ex?.id
        }

        if (tagId) {
          await tx
            .insert(bookmarkTags)
            .values({ bookmarkId: id, tagId })
            .onConflictDoNothing()
        }
      }
    }
  })

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /bookmarks/:id
// ─────────────────────────────────────────────
bookmarksRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const result = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .returning({ id: bookmarks.id })

  if (!result.length) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Bookmark not found' }
    }, 404)
  }

  return c.json({ data: { success: true }, error: null })
})

export default bookmarksRouter
