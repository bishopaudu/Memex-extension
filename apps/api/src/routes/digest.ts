import { Hono } from 'hono'
import { db, bookmarks, users, topics } from '../db'
import { eq, and, gte, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { sendWeeklyDigest } from '../lib/email'

const digestRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

digestRouter.use('*', authMiddleware)

// POST /digest/send — send digest to current user
digestRouter.post('/send', async (c) => {
  const userId    = c.get('userId')
  const userEmail = c.get('userEmail')

  // Get bookmarks from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentBookmarks = await db.query.bookmarks.findMany({
    where: and(
      eq(bookmarks.userId, userId),
      eq(bookmarks.isArchived, false),
      gte(bookmarks.createdAt, oneWeekAgo),
    ),
    orderBy: [desc(bookmarks.createdAt)],
    limit: 20,
  })

  const topicCount = await db.query.topics.findMany({
    where: eq(topics.userId, userId),
  }).then(t => t.length)

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  const bookmarkItems = recentBookmarks.map(b => {
    let domain = ''
    try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
    return { title: b.title ?? '', url: b.url, domain }
  })

  await sendWeeklyDigest(
    userEmail,
    user?.name ?? userEmail.split('@')[0],
    bookmarkItems,
    topicCount,
  )

  return c.json({
    data: {
      sent:      true,
      to:        userEmail,
      bookmarks: bookmarkItems.length,
    },
    error: null,
  })
})

export default digestRouter
