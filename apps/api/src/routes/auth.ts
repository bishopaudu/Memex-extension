import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
//import { db, users, sessions } from '../db'
import { eq, sql ,and} from 'drizzle-orm'
import { signToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'
import { db, users, sessions, bookmarks, topics, collections, tags } from '../db'
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
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })

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
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      token,
    },
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
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
    .select({ id: users.id, email: users.email, name: users.name, username: users.username, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  return c.json({ data: { user }, error: null })
})


// ─────────────────────────────────────────────
// GET /auth/stats — user's personal stats
// ─────────────────────────────────────────────
auth.get('/stats', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const [
    bookmarkCount,
    topicCount,
    collectionCount,
    tagCount,
    archivedCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.isArchived, false)))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` })
      .from(topics)
      .where(eq(topics.userId, userId))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` })
      .from(collections)
      .where(eq(collections.userId, userId))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` })
      .from(tags)
      .where(eq(tags.userId, userId))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.isArchived, true)))
      .then(r => r[0]?.count ?? 0),
  ])

  return c.json({
    data: { bookmarkCount, topicCount, collectionCount, tagCount, archivedCount },
    error: null,
  })
})

// ─────────────────────────────────────────────
// PATCH /auth/profile — update name + username
// ─────────────────────────────────────────────
auth.patch('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name, username } = await c.req.json()

  // Check username uniqueness
  if (username) {
    const clean = username.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, clean), sql`id != ${userId}::uuid`))
      .limit(1)

    if (existing.length > 0) {
      return c.json({
        data:  null,
        error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' }
      }, 400)
    }

    await db.update(users)
      .set({ name: name ?? null, username: clean })
      .where(eq(users.id, userId))
  } else {
    await db.update(users)
      .set({ name: name ?? null })
      .where(eq(users.id, userId))
  }

  const updated = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  return c.json({ data: { user: updated }, error: null })
})

// ─────────────────────────────────────────────
// POST /auth/change-password
// ─────────────────────────────────────────────
auth.post('/change-password', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { currentPassword, newPassword } = await c.req.json()

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  const bcrypt = await import('bcryptjs')
  const valid  = await bcrypt.compare(currentPassword, user.password)

  if (!valid) {
    return c.json({
      data:  null,
      error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
    }, 400)
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await db.update(users).set({ password: hash }).where(eq(users.id, userId))

  return c.json({ data: { success: true }, error: null })
})

// ─────────────────────────────────────────────
// POST /auth/avatar — upload profile photo
// ─────────────────────────────────────────────
auth.post('/avatar', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { imageDataUrl } = await c.req.json()

  if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
    return c.json({
      data:  null,
      error: { code: 'INVALID_IMAGE', message: 'Invalid image data' }
    }, 400)
  }

  try {
    const { uploadScreenshot } = await import('../lib/storage')
    const result = await uploadScreenshot(imageDataUrl, userId)

    if (!result) {
      return c.json({
        data:  null,
        error: { code: 'UPLOAD_FAILED', message: 'Failed to upload image' }
      }, 500)
    }

    await db.update(users)
      .set({ avatarUrl: result.url })
      .where(eq(users.id, userId))

    return c.json({ data: { avatarUrl: result.url }, error: null })
  } catch (err) {
    console.error('[Avatar upload]', err)
    return c.json({
      data:  null,
      error: { code: 'UPLOAD_FAILED', message: 'Upload failed' }
    }, 500)
  }
})

export default auth
