import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db, feedback } from '../db'

const feedbackRouter = new Hono()

const submitSchema = z.object({
  email:    z.string().email().optional().or(z.literal('')),
  category: z.enum(['bug', 'feature', 'general', 'other']).default('general'),
  message:  z.string().min(5).max(5000),
})

// ─────────────────────────────────────────────
// POST /feedback — public, no auth required
// ─────────────────────────────────────────────
feedbackRouter.post('/', zValidator('json', submitSchema), async (c) => {
  const input = c.req.valid('json')

  await db.insert(feedback).values({
    userId:   null,
    email:    input.email || null,
    category: input.category,
    message:  input.message,
  })

  console.log(`[Feedback] New ${input.category} feedback received`)

  // Send email notification if Resend is configured
  if (process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const result = await resend.emails.send({
        from:    'Memex <onboarding@resend.dev>',
        to:      process.env.FEEDBACK_EMAIL,
        subject: `[Memex Feedback] ${input.category}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <p><strong>Category:</strong> ${input.category}</p>
            <p><strong>From:</strong> ${input.email || 'Anonymous'}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${input.message}</p>
          </div>`,
      })
      console.log('[Feedback email] Sent:', JSON.stringify(result))
    } catch (err) {
      console.error('[Feedback email] FAILED:', err)
    }
  } else {
    console.log('[Feedback email] Skipped — RESEND_API_KEY or FEEDBACK_EMAIL not set')
  }

  return c.json({ data: { success: true }, error: null }, 201)
})

export default feedbackRouter
