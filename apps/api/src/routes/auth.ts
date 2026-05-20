import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db, users, sessions } from '../db'
import { eq } from 'drizzle-orm'
import { signToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono()

// ─────────────────────────────────────────────
// Input validation schemas
// zod validates the request body before your handler runs
// if validation fails, Hono returns 400 automatically
// ─────────────────────────────────────────────
const signupSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

// ─────────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────────
auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password, name } = c.req.valid('json')

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  if (existing.length > 0) {
    return c.json({ data: null, error: { code: 'EMAIL_TAKEN', message: 'Email already in use' } }, 400)
  }

  // Hash password — never store plaintext passwords
  // bcrypt cost factor 12 is the industry standard balance of security vs speed
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name ?? null,
    })
    .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })

  // Create session
  const sessionId = nanoid(32)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.insert(sessions).values({
    id:        sessionId,
    userId:    user.id,
    expiresAt,
  })

  // Sign JWT containing both userId and sessionId
  // sessionId lets us verify the session still exists on each request
  const token = await signToken({
    userId:    user.id,
    email:     user.email,
    sessionId,
  })

  return c.json({
    data: { user: { id: user.id, email: user.email, name: user.name }, token },
    error: null,
  }, 201)
})

// ─────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  // Same error message whether email or password is wrong
  // Never tell attackers which one is incorrect
  if (!user) {
    return c.json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)
  }

  const passwordValid = await bcrypt.compare(password, user.password)

  if (!passwordValid) {
    return c.json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)
  }

  // Create new session
  const sessionId = nanoid(32)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt })

  const token = await signToken({ userId: user.id, email: user.email, sessionId })

  return c.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    },
    error: null,
  })
})

// ─────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────
auth.post('/logout', authMiddleware, async (c) => {
  // Delete session from DB — this is why we store sessions server-side
  // The JWT alone can't be invalidated, but checking the DB session can
  const token = c.req.header('Authorization')!.slice(7)

  // We need the sessionId from the token to delete it
  // A cleaner approach: store sessionId in context via middleware
  // For now we re-verify to extract sessionId
  const { verifyToken } = await import('../lib/jwt')
  const payload = await verifyToken(token)

  if (payload?.sessionId) {
    await db.delete(sessions).where(eq(sessions.id, payload.sessionId as string))
  }

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  return c.json({ data: { user }, error: null })
})

export default auth
