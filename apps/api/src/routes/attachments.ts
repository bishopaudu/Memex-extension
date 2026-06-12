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

// Single flat schema — handles all attachment types
const createSchema = z.object({
  bookmarkId:   z.string().uuid(),
  type:         z.enum(['text', 'screenshot', 'area_screenshot', 'image']),
  // Text
  content:      z.string().optional(),
  // Image — either raw base64 or pre-uploaded URL
  imageDataUrl: z.string().optional(),
  url:          z.string().optional(),
  publicId:     z.string().optional(),
  label:        z.string().optional(),
})

attachmentsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.get('userId')
  const input  = c.req.valid('json')

  // Verify bookmark belongs to this user
  const [bookmark] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.id, input.bookmarkId),
      eq(bookmarks.userId, userId)
    ))
    .limit(1)

  if (!bookmark) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Bookmark not found' }
    }, 404)
  }

  // ── TEXT ATTACHMENT ──
  if (input.type === 'text') {
    if (!input.content) {
      return c.json({
        data:  null,
        error: { code: 'MISSING_CONTENT', message: 'content is required for text attachments' }
      }, 400)
    }

    const [attachment] = await db
      .insert(attachments)
      .values({
        bookmarkId: input.bookmarkId,
        userId,
        type:       'text',
        content:    input.content,
        label:      input.label ?? null,
      })
      .returning()

    return c.json({ data: { attachment }, error: null }, 201)
  }

  // ── IMAGE ATTACHMENT ──
  let finalUrl:      string
  let finalPublicId: string | null = null

  if (input.url) {
    // Pre-uploaded — just store the URL
    finalUrl      = input.url
    finalPublicId = input.publicId ?? null
    console.log('[Attachments] Using pre-uploaded URL:', finalUrl)
  } else if (input.imageDataUrl) {
    // Raw base64 — upload to Cloudinary
    console.log('[Attachments] Uploading base64 image to Cloudinary...')
    const uploaded = await uploadScreenshot(input.imageDataUrl, userId)
    if (!uploaded) {
      return c.json({
        data:  null,
        error: { code: 'UPLOAD_FAILED', message: 'Image upload to Cloudinary failed' }
      }, 500)
    }
    finalUrl      = uploaded.url
    finalPublicId = uploaded.publicId
    console.log('[Attachments] Uploaded to Cloudinary:', finalUrl)
  } else {
    return c.json({
      data:  null,
      error: { code: 'MISSING_IMAGE', message: 'Provide imageDataUrl or url' }
    }, 400)
  }

  const [attachment] = await db
    .insert(attachments)
    .values({
      bookmarkId: input.bookmarkId,
      userId,
      type:       input.type,
      url:        finalUrl,
      storageKey: finalPublicId,
      label:      input.label ?? null,
    })
    .returning()

  console.log('[Attachments] Created attachment:', attachment.id, attachment.type)
  return c.json({ data: { attachment }, error: null }, 201)
})

// ── GET /attachments?bookmarkId=xxx ──
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

// ── DELETE /attachments/:id ──
attachmentsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(and(
      eq(attachments.id, id),
      eq(attachments.userId, userId)
    ))
    .limit(1)

  if (!attachment) {
    return c.json({
      data:  null,
      error: { code: 'NOT_FOUND', message: 'Attachment not found' }
    }, 404)
  }

  if (attachment.storageKey) {
    await deleteScreenshot(attachment.storageKey)
  }

  await db.delete(attachments).where(eq(attachments.id, id))

  return c.json({ data: { success: true }, error: null })
})


// ─────────────────────────────────────────────
// PATCH /attachments/:id — update text content
// ─────────────────────────────────────────────
const updateSchema = z.object({
  content: z.string(),
})

attachmentsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.get('userId')
  const id     = c.req.param('id')
  const { content } = c.req.valid('json')

  const [existing] = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Attachment not found' } }, 404)
  }

  await db.update(attachments)
    .set({ content })
    .where(eq(attachments.id, id))

  return c.json({ data: { success: true }, error: null })
})

export default attachmentsRouter
