import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, attachments, bookmarks } from '../db'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { uploadScreenshot, deleteScreenshot } from '../lib/storage'

const attachmentsRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

attachmentsRouter.use('*', authMiddleware)

// ─────────────────────────────────────────────
// POST /attachments
// Create a new attachment for a bookmark
// Handles both image uploads (base64) and text
// ─────────────────────────────────────────────
const createSchema = z.discriminatedUnion('type', [
  // Text attachment
  z.object({
    type:       z.literal('text'),
    bookmarkId: z.string().uuid(),
    content:    z.string().min(1),
    label:      z.string().optional(),
  }),
  // Screenshot attachment (full page, auto-captured)
  z.object({
    type:         z.literal('screenshot'),
    bookmarkId:   z.string().uuid(),
    imageDataUrl: z.string().startsWith('data:image/'),
    label:        z.string().optional(),
  }),
  // Area screenshot (user-selected region)
  z.object({
    type:         z.literal('area_screenshot'),
    bookmarkId:   z.string().uuid(),
    imageDataUrl: z.string().startsWith('data:image/'),
    label:        z.string().optional(),
  }),
  // Generic image upload
  z.object({
    type:         z.literal('image'),
    bookmarkId:   z.string().uuid(),
    imageDataUrl: z.string().startsWith('data:image/'),
    label:        z.string().optional(),
  }),
])

attachmentsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')

  // Verify the bookmark belongs to this user
  const [bookmark] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.id, input.bookmarkId), eq(bookmarks.userId, userId)))
    .limit(1)

  if (!bookmark) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Bookmark not found' }
    }, 404)
  }

  // Text attachment — no upload needed
  if (input.type === 'text') {
    const [attachment] = await db
      .insert(attachments)
      .values({
        bookmarkId: input.bookmarkId,
        userId,
        type:    'text',
        content: input.content,
        label:   input.label ?? null,
      })
      .returning()

    return c.json({ data: { attachment }, error: null }, 201)
  }

  // Image-based attachment — upload to Cloudinary
  const uploaded = await uploadScreenshot(input.imageDataUrl, userId)

  if (!uploaded) {
    return c.json({
      data:  null,
      error: { code: 'UPLOAD_FAILED', message: 'Image upload failed' }
    }, 500)
  }

  const [attachment] = await db
    .insert(attachments)
    .values({
      bookmarkId:  input.bookmarkId,
      userId,
      type:        input.type,
      url:         uploaded.url,
      storageKey:  uploaded.publicId,
      label:       input.label ?? null,
    })
    .returning()

  return c.json({ data: { attachment }, error: null }, 201)
})

// ─────────────────────────────────────────────
// GET /attachments?bookmarkId=xxx
// Get all attachments for a bookmark
// ─────────────────────────────────────────────
attachmentsRouter.get('/', async (c) => {
  const userId     = c.get('userId')
  const bookmarkId = c.req.query('bookmarkId')

  if (!bookmarkId) {
    return c.json({
      data:  null,
      error: { code: 'MISSING_PARAM', message: 'bookmarkId is required' }
    }, 400)
  }

  const result = await db
    .select()
    .from(attachments)
    .where(and(
      eq(attachments.bookmarkId, bookmarkId),
      eq(attachments.userId, userId)
    ))

  return c.json({ data: { items: result }, error: null })
})

// ─────────────────────────────────────────────
// DELETE /attachments/:id
// ─────────────────────────────────────────────
attachmentsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
    .limit(1)

  if (!attachment) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Attachment not found' }
    }, 404)
  }

  // Delete from Cloudinary if it's an image
  if (attachment.storageKey) {
    await deleteScreenshot(attachment.storageKey)
  }

  await db.delete(attachments).where(eq(attachments.id, id))

  return c.json({ data: { success: true }, error: null })
})

export default attachmentsRouter
