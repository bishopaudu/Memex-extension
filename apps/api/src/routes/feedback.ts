import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db, feedback } from '../db'
import { authMiddleware } from '../middleware/auth'

const feedbackRouter = new Hono<{
  Variables: { userId?: string; userEmail?: string }
}>()

const submitSchema = z.object({
  email:    z.string().email().optional(),
  category: z.enum(['bug', 'feature', 'general', 'other']).default('general'),
  message:  z.string().min(5).max(5000),
})

// ─────────────────────────────────────────────
// POST /feedback — public, but uses auth if present
// ─────────────────────────────────────────────
feedbackRouter.post('/', zValidator('json', submitSchema), async (c) => {
  const input = c.req.valid('json')

  // Try to get userId from auth header if present (optional)
  let userId: string | undefined
  let userEmail = input.email

  const authHeader = c.req.header('Authorization')
  if (authHeader) {
    try {
      await authMiddleware(c, async () => {})
      userId    = c.get('userId')
      userEmail = userEmail ?? c.get('userEmail')
    } catch {}
  }

  await db.insert(feedback).values({
    userId:   userId ?? null,
    email:    userEmail ?? null,
    category: input.category,
    message:  input.message,
  })

  // Send email notification if Resend is configured
  if (process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from:    'Memex <feedback@memex.app>',
        to:      process.env.FEEDBACK_EMAIL,
        subject: `[Memex Feedback] ${input.category}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <p><strong>Category:</strong> ${input.category}</p>
            <p><strong>From:</strong> ${userEmail ?? 'Anonymous'}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${input.message}</p>
          </div>`,
      })
    } catch (err) {
      console.error('[Feedback email]', err)
    }
  }

  return c.json({ data: { success: true }, error: null }, 201)
})

export default feedbackRouter
