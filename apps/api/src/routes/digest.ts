import { Hono } from 'hono'
import { db, bookmarks, users, topics } from '../db'
import { eq, and, gte, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

const digestRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

digestRouter.use('*', authMiddleware)

digestRouter.post('/send', async (c) => {
  const userId    = c.get('userId')
  const userEmail = c.get('userEmail')

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentBookmarks = await db.query.bookmarks.findMany({
    where: and(
      eq(bookmarks.userId,     userId),
      eq(bookmarks.isArchived, false),
      gte(bookmarks.createdAt, oneWeekAgo),
    ),
    orderBy: [desc(bookmarks.createdAt)],
    limit: 20,
  })

  const allTopics = await db.query.topics.findMany({
    where: eq(topics.userId, userId),
  })

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  const bookmarkItems = recentBookmarks.map(b => {
    let domain = ''
    try { domain = new URL(b.url).hostname.replace('www.', '') } catch {}
    return { title: b.title ?? '', url: b.url, domain }
  })

  // Email sending — requires RESEND_API_KEY
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const rows = bookmarkItems.slice(0, 5).map(b =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #1e1e1e">
          <a href="${b.url}" style="color:#7b93ff;text-decoration:none;font-size:13px">
            ${b.title || b.domain}
          </a>
          <span style="color:#555;font-size:11px;margin-left:8px">${b.domain}</span>
        </td></tr>`
      ).join('')

      await resend.emails.send({
        from:    'Memex <digest@memex.app>',
        to:      userEmail,
        subject: `Your week in knowledge — ${bookmarkItems.length} bookmarks`,
        html: `
          <div style="background:#0a0a0a;color:#e2e2e2;font-family:sans-serif;
                      max-width:520px;margin:0 auto;padding:40px 20px">
            <h1 style="font-size:20px;margin:0 0 8px">Your week in knowledge ✨</h1>
            <p style="color:#555;font-size:13px;margin:0 0 24px">
              Hi ${user?.name ?? userEmail.split('@')[0]}, here's what you saved
            </p>
            <table style="width:100%;border-collapse:collapse">${rows}</table>
            <div style="text-align:center;margin-top:32px">
              <a href="${process.env.APP_URL ?? 'http://localhost:5173'}"
                 style="background:#4f6ef7;color:#fff;padding:12px 28px;
                        border-radius:12px;text-decoration:none;font-size:13px">
                Open Memex →
              </a>
            </div>
          </div>`,
      })
      console.log(`[Digest] Sent to ${userEmail}`)
    } catch (err) {
      console.error('[Digest] Email failed:', err)
    }
  } else {
    console.log('[Digest] RESEND_API_KEY not set — skipping email send')
  }

  return c.json({
    data: { sent: true, to: userEmail, bookmarks: bookmarkItems.length },
    error: null,
  })
})

export default digestRouter
