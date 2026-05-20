import { Hono } from 'hono'
import { db, tags, bookmarkTags } from '../db'
import { eq, sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

const tagsRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

tagsRouter.use('*', authMiddleware)

// GET /tags — returns all tags with bookmark counts
tagsRouter.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await db
    .select({
      id:    tags.id,
      name:  tags.name,
      color: tags.color,
      // Count how many bookmarks use each tag
      count: sql<number>`count(${bookmarkTags.bookmarkId})::int`,
    })
    .from(tags)
    .leftJoin(bookmarkTags, eq(bookmarkTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(tags.name)

  return c.json({ data: { items: result }, error: null })
})

export default tagsRouter
