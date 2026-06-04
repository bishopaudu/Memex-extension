import { Hono } from 'hono'
import { db, readingList, bookmarks, bookmarkTags, tags, attachments } from '../db'
import { eq, and, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

const readingRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

readingRouter.use('*', authMiddleware)

// GET /reading — list reading list
readingRouter.get('/', async (c) => {
  const userId  = c.get('userId')
  const filter  = c.req.query('filter') ?? 'unread' // unread | read | all

  const items = await db.query.readingList.findMany({
    where: and(
      eq(readingList.userId, userId),
      filter === 'unread' ? eq(readingList.isRead, false)
      : filter === 'read' ? eq(readingList.isRead, true)
      : undefined,
    ),
    with: { bookmark: { with: { bookmarkTags: { with: { tag: true } } } } },
    orderBy: (rl, { desc }) => [desc(rl.addedAt)],
  })

  return c.json({
    data: {
      items: items.map(item => ({
        id:       item.id,
        isRead:   item.isRead,
        addedAt:  item.addedAt,
        readAt:   item.readAt,
        bookmark: {
          ...item.bookmark,
          tags: item.bookmark.bookmarkTags.map(bt => bt.tag),
        },
      }))
    },
    error: null,
  })
})

// POST /reading — add bookmark to reading list
readingRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const { bookmarkId } = await c.req.json()

  await db.insert(readingList)
    .values({ userId, bookmarkId })
    .onConflictDoNothing()

  return c.json({ data: { success: true }, error: null }, 201)
})

// PATCH /reading/:bookmarkId — mark as read/unread
readingRouter.patch('/:bookmarkId', async (c) => {
  const userId     = c.get('userId')
  const bookmarkId = c.req.param('bookmarkId')
  const { isRead } = await c.req.json()

  await db.update(readingList)
    .set({
      isRead,
      readAt: isRead ? new Date() : null,
    })
    .where(and(
      eq(readingList.userId,     userId),
      eq(readingList.bookmarkId, bookmarkId),
    ))

  return c.json({ data: { success: true }, error: null })
})

// DELETE /reading/:bookmarkId — remove from list
readingRouter.delete('/:bookmarkId', async (c) => {
  const userId     = c.get('userId')
  const bookmarkId = c.req.param('bookmarkId')

  await db.delete(readingList)
    .where(and(
      eq(readingList.userId,     userId),
      eq(readingList.bookmarkId, bookmarkId),
    ))

  return c.json({ data: { success: true }, error: null })
})

export default readingRouter
