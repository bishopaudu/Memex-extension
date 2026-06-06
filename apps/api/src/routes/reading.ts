import { Hono } from 'hono'
import { db, readingList, bookmarks } from '../db'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

const readingRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

readingRouter.use('*', authMiddleware)

readingRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const filter = c.req.query('filter') ?? 'unread'

  const conditions = [eq(readingList.userId, userId)]
  if (filter === 'unread') conditions.push(eq(readingList.isRead, false))
  if (filter === 'read')   conditions.push(eq(readingList.isRead, true))

  const items = await db.query.readingList.findMany({
    where: and(...conditions),
    with:  { bookmark: { with: { bookmarkTags: { with: { tag: true } } } } },
    orderBy: (rl, { desc }) => [desc(rl.addedAt)],
  })

  return c.json({
    data: {
      items: items.map(item => ({
        id:      `${item.userId}-${item.bookmarkId}`,
        isRead:  item.isRead,
        addedAt: item.addedAt,
        readAt:  item.readAt,
        bookmark: {
          ...item.bookmark,
          tags: item.bookmark.bookmarkTags.map((bt: any) => bt.tag),
        },
      }))
    },
    error: null,
  })
})

readingRouter.post('/', async (c) => {
  const userId         = c.get('userId')
  const { bookmarkId } = await c.req.json()

  await db.insert(readingList)
    .values({ userId, bookmarkId })
    .onConflictDoNothing()

  return c.json({ data: { success: true }, error: null }, 201)
})

readingRouter.patch('/:bookmarkId', async (c) => {
  const userId     = c.get('userId')
  const bookmarkId = c.req.param('bookmarkId')
  const { isRead } = await c.req.json()

  await db.update(readingList)
    .set({ isRead, readAt: isRead ? new Date() : null })
    .where(and(
      eq(readingList.userId,     userId),
      eq(readingList.bookmarkId, bookmarkId),
    ))

  return c.json({ data: { success: true }, error: null })
})

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
