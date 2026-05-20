import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyToken } from '../lib/jwt'
import { db } from '../db'
import { sessions, users } from '../db/schema'
import { eq, and, gt } from 'drizzle-orm'

// This middleware runs before any protected route handler
// It reads the JWT from Authorization header, verifies it,
// checks the session is still valid, then attaches the user
// to the context so route handlers can access it

export const authMiddleware = createMiddleware<{
  Variables: {
    userId: string
    userEmail: string
  }
}>(async (c, next) => {
  // Read the Authorization header
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix

  // Verify the JWT signature and expiry
  const payload = await verifyToken(token)

  if (!payload) {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  // Verify session still exists in DB (allows server-side logout)
  // This is the key security difference vs stateless JWT-only auth —
  // we can invalidate sessions immediately when user logs out
  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.sessionId as string),
        gt(sessions.expiresAt, new Date()) // not expired
      )
    )
    .limit(1)

  if (!session.length) {
    throw new HTTPException(401, { message: 'Session expired or not found' })
  }

  // Attach userId to context — route handlers read this with c.get('userId')
  c.set('userId', payload.userId as string)
  c.set('userEmail', payload.email as string)

  await next()
})
