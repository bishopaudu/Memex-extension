import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, bookmarks, tags, bookmarkTags, attachments, bookmarkCollections } from '../db'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

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
  title:         z.string().optional(),
  description:   z.string().optional(),
  isArchived:    z.boolean().optional(),
  isPublic:      z.boolean().optional(),
  screenshotUrl: optionalUrl,
  screenshotKey: z.string().optional(),
  tags:          z.array(z.string()).optional(),
})

// ─────────────────────────────────────────────
// GET /bookmarks
// ─────────────────────────────────────────────
bookmarksRouter.get('/', async (c) => {
  const userId       = c.get('userId')
  const search       = c.req.query('search') ?? ''
  const tagFilter    = c.req.query('tag')    ?? ''
  const page         = parseInt(c.req.query('page')  ?? '1')
  const limit        = Math.min(parseInt(c.req.query('limit') ?? '20'), 100)
  const offset       = (page - 1) * limit
  const collectionId = c.req.query('collectionId') ?? ''
  const archivedOnly  = c.req.query('archived') === 'true'

  // If filtering by collection, get bookmark IDs first
  let collectionBookmarkIds: string[] = []
  if (collectionId) {
    const rows = await db
      .select({ bookmarkId: bookmarkCollections.bookmarkId })
      .from(bookmarkCollections)
      .where(eq(bookmarkCollections.collectionId, collectionId))
    collectionBookmarkIds = rows.map(r => r.bookmarkId)

    if (collectionBookmarkIds.length === 0) {
      return c.json({ data: { items: [], page, limit }, error: null })
    }
  }

  // Tag filter — get bookmark IDs that have this tag
  let tagBookmarkIds: string[] = []
  if (tagFilter) {
    const tagRows = await db
      .select({ bookmarkId: bookmarkTags.bookmarkId })
      .from(bookmarkTags)
      .innerJoin(tags, and(
        eq(tags.id, bookmarkTags.tagId),
        eq(tags.name, tagFilter),
        eq(tags.userId, userId)
      ))
    tagBookmarkIds = tagRows.map(r => r.bookmarkId)

    if (tagBookmarkIds.length === 0) {
      return c.json({ data: { items: [], page, limit }, error: null })
    }
  }

  const results = await db.query.bookmarks.findMany({
    where: and(
      eq(bookmarks.userId, userId),
      archivedOnly ? eq(bookmarks.isArchived, true) : eq(bookmarks.isArchived, false),
      collectionId && collectionBookmarkIds.length > 0
        ? inArray(bookmarks.id, collectionBookmarkIds)
        : undefined,
      tagFilter && tagBookmarkIds.length > 0
        ? inArray(bookmarks.id, tagBookmarkIds)
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

  // Fetch attachments for all bookmarks
  const bookmarkIds = results.map(b => b.id)
  const allAttachments = await db
    .select()
    .from(attachments)
    .where(inArray(attachments.bookmarkId, bookmarkIds))

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
// POST /bookmarks — NO AI, instant save
// ─────────────────────────────────────────────
bookmarksRouter.post('/', zValidator('json', createBookmarkSchema), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')
  const userTags = input.tags ?? []

  const bookmark = await db.transaction(async (tx) => {
    const [newBookmark] = await tx
      .insert(bookmarks)
      .values({
        userId,
        url:           input.url,
        title:         input.title         ?? null,
        description:   input.description   ?? null,
        faviconUrl:    input.faviconUrl    ?? null,
        ogImageUrl:    input.ogImageUrl    ?? null,
        screenshotUrl: input.screenshotUrl ?? null,
        screenshotKey: input.screenshotKey ?? null,
      })
      .returning()

    for (const tagName of userTags) {
      const clean = tagName.toLowerCase().trim().replace(/[^a-z0-9\-]/g, '')
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

  return c.json({ data: { bookmark }, error: null }, 201)
})

// ─────────────────────────────────────────────
// GET /bookmarks/:id
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
    // Build update object — only include fields that were sent
    const updates: Record<string, any> = { updatedAt: new Date() }
    if (input.title         !== undefined) updates.title         = input.title
    if (input.description   !== undefined) updates.description   = input.description
    if (input.isArchived    !== undefined) updates.isArchived    = input.isArchived
    if (input.screenshotUrl !== undefined) updates.screenshotUrl = input.screenshotUrl
    if (input.screenshotKey !== undefined) updates.screenshotKey = input.screenshotKey
    if (input.isPublic      !== undefined) {
      updates.isPublic = input.isPublic
      // Generate public slug when making public
      if (input.isPublic) {
        const titleSlug = (input.title ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50)
        updates.publicSlug = titleSlug
          ? `${titleSlug}-${id.slice(0, 6)}`
          : id.slice(0, 8)
      }
    }

    await tx
      .update(bookmarks)
      .set(updates)
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

  // Return slug so frontend can build share URL
  const [updated] = await db
    .select({ publicSlug: bookmarks.publicSlug, isPublic: bookmarks.isPublic })
    .from(bookmarks)
    .where(eq(bookmarks.id, id))
    .limit(1)

  return c.json({ data: { success: true, publicSlug: updated?.publicSlug, isPublic: updated?.isPublic }, error: null })
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
