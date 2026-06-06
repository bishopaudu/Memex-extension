import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, collections, bookmarkCollections, bookmarks, bookmarkTags, tags, attachments } from '../db'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { generateSlug } from './public'

const collectionsRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

collectionsRouter.use('*', authMiddleware)

const createCollectionSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  color:       z.string().optional().default('#4f6ef7'),
  icon:        z.string().optional().default('📁'),
})

const updateCollectionSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color:       z.string().optional(),
  icon:        z.string().optional(),
  isPublic:    z.boolean().optional(),
})

// ─────────────────────────────────────────────
// GET /collections
// Returns all collections with bookmark count
// ─────────────────────────────────────────────
collectionsRouter.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await db
    .select({
      id:          collections.id,
      name:        collections.name,
      description: collections.description,
      color:       collections.color,
      icon:        collections.icon,
      isPublic:    collections.isPublic,
      createdAt:   collections.createdAt,
      count:       sql<number>`count(${bookmarkCollections.bookmarkId})::int`,
    })
    .from(collections)
    .leftJoin(bookmarkCollections, eq(bookmarkCollections.collectionId, collections.id))
    .where(eq(collections.userId, userId))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt))

  return c.json({ data: { items: result }, error: null })
})

// ─────────────────────────────────────────────
// POST /collections
// ─────────────────────────────────────────────
collectionsRouter.post('/', zValidator('json', createCollectionSchema), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')

  const [collection] = await db
    .insert(collections)
    .values({ userId, ...input })
    .returning()

  return c.json({ data: { collection }, error: null }, 201)
})

// ─────────────────────────────────────────────
// GET /collections/:id
// Returns collection with full bookmarks + attachments
// ─────────────────────────────────────────────
collectionsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.userId, userId)),
  })

  if (!collection) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Collection not found' }
    }, 404)
  }

  // Get bookmark IDs in this collection
  const bcRows = await db
    .select({ bookmarkId: bookmarkCollections.bookmarkId })
    .from(bookmarkCollections)
    .where(eq(bookmarkCollections.collectionId, id))

  const bookmarkIds = bcRows.map(r => r.bookmarkId)

  if (bookmarkIds.length === 0) {
    return c.json({
      data: {
        collection: {
          ...collection,
          bookmarks: [],
        }
      },
      error: null,
    })
  }

  // Fetch full bookmarks with tags
  const bookmarkRows = await db.query.bookmarks.findMany({
    where: inArray(bookmarks.id, bookmarkIds),
    with: { bookmarkTags: { with: { tag: true } } },
  })

  // Fetch attachments for all bookmarks
  const allAttachments = await db
    .select()
    .from(attachments)
    .where(inArray(attachments.bookmarkId, bookmarkIds))

  const attsByBookmark = allAttachments.reduce((acc, att) => {
    if (!acc[att.bookmarkId]) acc[att.bookmarkId] = []
    acc[att.bookmarkId].push(att)
    return acc
  }, {} as Record<string, typeof allAttachments>)

  const bookmarkItems = bookmarkRows.map(b => ({
    id:            b.id,
    url:           b.url,
    title:         b.title,
    description:   b.description,
    screenshotUrl: b.screenshotUrl,
    faviconUrl:    b.faviconUrl,
    ogImageUrl:    b.ogImageUrl,
    isArchived:    b.isArchived,
    tags:          b.bookmarkTags.map(bt => bt.tag),
    attachments:   attsByBookmark[b.id] ?? [],
    createdAt:     b.createdAt,
    updatedAt:     b.updatedAt,
  }))

  return c.json({
    data: {
      collection: {
        ...collection,
        bookmarks: bookmarkItems,
      }
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// PATCH /collections/:id
// ─────────────────────────────────────────────
collectionsRouter.patch('/:id', zValidator('json', updateCollectionSchema), async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const input  = c.req.valid('json')

  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Collection not found' }
    }, 404)
  }

  const [updated] = await db
    .update(collections)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning()

  return c.json({ data: { collection: updated }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /collections/:id
// ─────────────────────────────────────────────
collectionsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const result = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning({ id: collections.id })

  if (!result.length) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Collection not found' }
    }, 404)
  }

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// POST /collections/:id/bookmarks
// Add a bookmark to a collection
// ─────────────────────────────────────────────
collectionsRouter.post('/:id/bookmarks', async (c) => {
  const userId       = c.get('userId')
  const collectionId = c.req.param('id')
  const { bookmarkId } = await c.req.json()

  if (!bookmarkId) {
    return c.json({
      data:  null,
      error: { code: 'MISSING_FIELD', message: 'bookmarkId is required' }
    }, 400)
  }

  // Verify both belong to the user
  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (!collection) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Collection not found' }
    }, 404)
  }

  await db
    .insert(bookmarkCollections)
    .values({ bookmarkId, collectionId })
    .onConflictDoNothing()

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /collections/:id/bookmarks/:bookmarkId
// Remove a bookmark from a collection
// ─────────────────────────────────────────────
collectionsRouter.delete('/:id/bookmarks/:bookmarkId', async (c) => {
  const userId       = c.get('userId')
  const collectionId = c.req.param('id')
  const bookmarkId   = c.req.param('bookmarkId')

  await db
    .delete(bookmarkCollections)
    .where(
      and(
        eq(bookmarkCollections.collectionId, collectionId),
        eq(bookmarkCollections.bookmarkId, bookmarkId)
      )
    )

  return c.json({ data: { success: true }, error: null })
})

collectionsRouter.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const input  = await c.req.json()

  const [existing] = await db
    .select({ id: collections.id, name: collections.name, slug: collections.slug })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Collection not found' } }, 404)
  }

  const updates: any = { updatedAt: new Date() }
  if (input.name        !== undefined) updates.name        = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.color       !== undefined) updates.color       = input.color
  if (input.icon        !== undefined) updates.icon        = input.icon
  if (input.isPublic    !== undefined) {
    updates.isPublic = input.isPublic
    // Generate slug when making public
    if (input.isPublic && !existing.slug) {
      updates.slug = generateSlug(existing.name)
    }
  }

  await db.update(collections).set(updates).where(eq(collections.id, id))

  const [updated] = await db
    .select({ slug: collections.slug, isPublic: collections.isPublic })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1)

  return c.json({ data: { success: true, slug: updated?.slug, isPublic: updated?.isPublic }, error: null })
})

export default collectionsRouter
