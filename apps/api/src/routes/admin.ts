import { Hono } from 'hono'
import { db, users, bookmarks, topics, collections, attachments } from '../db'
import { eq, desc, sql, gte, count } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

// ─────────────────────────────────────────────
// ADMIN EMAILS — only these can access /api/admin
// Change to your real email(s)
// ─────────────────────────────────────────────
const ADMIN_EMAILS = [
  'johnkramer@gmail.com',
  // add more admins here
]

const adminRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

adminRouter.use('*', authMiddleware)

// Guard — only admin emails can proceed
adminRouter.use('*', async (c, next) => {
  const email = c.get('userEmail')
  if (!ADMIN_EMAILS.includes(email)) {
    return c.json({
      data:  null,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    }, 403)
  }
  await next()
})

// ─────────────────────────────────────────────
// GET /admin/stats — platform overview
// ─────────────────────────────────────────────
adminRouter.get('/stats', async (c) => {
  const oneWeekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    totalBookmarks,
    totalTopics,
    totalCollections,
    newBookmarksWeek,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users)
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(users)
      .where(gte(users.createdAt, oneWeekAgo))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(users)
      .where(gte(users.createdAt, oneMonthAgo))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(bookmarks)
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(topics)
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(collections)
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` }).from(bookmarks)
      .where(gte(bookmarks.createdAt, oneWeekAgo))
      .then(r => r[0]?.count ?? 0),
  ])

  return c.json({
    data: {
      users: { total: totalUsers, newThisWeek: newUsersWeek, newThisMonth: newUsersMonth },
      content: {
        bookmarks:   totalBookmarks,
        topics:      totalTopics,
        collections: totalCollections,
        newBookmarksThisWeek: newBookmarksWeek,
      },
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// GET /admin/users — list all users
// ─────────────────────────────────────────────
adminRouter.get('/users', async (c) => {
  const page  = parseInt(c.req.query('page')  ?? '1')
  const limit = parseInt(c.req.query('limit') ?? '20')
  const offset = (page - 1) * limit

  const allUsers = await db
    .select({
      id:        users.id,
      email:     users.email,
      username:  users.username,
      name:      users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  // Get bookmark count per user
  const userIds   = allUsers.map(u => u.id)
  const bookmarkCounts = await db
    .select({
      userId: bookmarks.userId,
      count:  sql<number>`count(*)::int`,
    })
    .from(bookmarks)
    .groupBy(bookmarks.userId)

  const countMap = Object.fromEntries(
    bookmarkCounts.map(r => [r.userId, r.count])
  )

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .then(r => r[0]?.count ?? 0)

  return c.json({
    data: {
      users: allUsers.map(u => ({
        ...u,
        bookmarkCount: countMap[u.id] ?? 0,
      })),
      total,
      page,
      limit,
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// DELETE /admin/users/:id — delete a user
// ─────────────────────────────────────────────
adminRouter.delete('/users/:id', async (c) => {
  const adminEmail = c.get('userEmail')
  const targetId   = c.req.param('id')

  // Safety: cannot delete yourself
  const admin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  })

  if (admin?.id === targetId) {
    return c.json({
      data:  null,
      error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' }
    }, 403)
  }

  await db.delete(users).where(eq(users.id, targetId))

  return c.json({ data: { success: true }, error: null })
})

export default adminRouter
