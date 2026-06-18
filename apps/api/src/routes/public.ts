import { Hono } from 'hono'
import {
  db, users, topics, topicBlocks, topicReferences,
  topicConnections, collections, bookmarkCollections,
  bookmarks, bookmarkTags, tags,
} from '../db'
import { eq, and, inArray, sql } from 'drizzle-orm'

export const publicRouter = new Hono()

// ─────────────────────────────────────────────
// Slug generator
// ─────────────────────────────────────────────
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '')
    || 'untitled'
}

// ─────────────────────────────────────────────
// GET /p/:username/topic/:slug — public topic
// ─────────────────────────────────────────────
publicRouter.get('/b/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    const rows = await db.execute(
      sql`SELECT b.*, u.username, u.name as user_name
          FROM bookmarks b
          JOIN users u ON u.id = b.user_id
          WHERE b.public_slug = ${slug}
          AND b.is_public = true
          LIMIT 1`
    )
    const bookmark = (rows as any)[0] ?? null
    if (!bookmark) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Bookmark not found' } }, 404)
    }

    // Get tags
    const tagRows = await db.execute(
      sql`SELECT t.id, t.name FROM tags t
          JOIN bookmark_tags bt ON bt.tag_id = t.id
          WHERE bt.bookmark_id = ${bookmark.id}::uuid`
    )

    // Get attachments
    const attRows = await db.execute(
      sql`SELECT * FROM attachments
          WHERE bookmark_id = ${bookmark.id}::uuid
          ORDER BY created_at ASC`
    )

    return c.json({
      data: {
        author:   { username: bookmark.username, name: bookmark.user_name },
        bookmark: {
          id:            bookmark.id,
          url:           bookmark.url,
          title:         bookmark.title,
          description:   bookmark.description,
          screenshotUrl: bookmark.screenshot_url,
          faviconUrl:    bookmark.favicon_url,
          ogImageUrl:    bookmark.og_image_url,
          createdAt:     bookmark.created_at,
          publicSlug:    bookmark.public_slug,
          tags:          tagRows as any[],
          attachments:   (attRows as any[]).filter(a => a.type !== 'text'),
          notes:         (attRows as any[]).filter(a => a.type === 'text'),
        }
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public bookmark]', err)
    return c.json({ data: null, error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, 500)
  }
})

publicRouter.get('/explore', async (c) => {
  const type = c.req.query('type') ?? 'all'

  try {
    const results: any = {}

    if (type === 'all' || type === 'topics') {
      const topicRows = await db.execute(
        sql`SELECT t.id, t.title, t.emoji, t.summary, t.cover_color,
                   t.slug, t.updated_at,
                   u.username, u.name as user_name, u.avatar_url
            FROM topics t
            JOIN users u ON u.id = t.user_id
            WHERE t.is_public = true AND t.slug IS NOT NULL
            ORDER BY t.updated_at DESC
            LIMIT 12`
      )
      results.topics = topicRows
    }

    if (type === 'all' || type === 'collections') {
      const collRows = await db.execute(
        sql`SELECT c.id, c.name, c.icon, c.color, c.description,
                   c.slug, c.updated_at,
                   u.username, u.name as user_name, u.avatar_url,
                   COUNT(bc.bookmark_id)::int as bookmark_count
            FROM collections c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN bookmark_collections bc ON bc.collection_id = c.id
            WHERE c.is_public = true AND c.slug IS NOT NULL
            GROUP BY c.id, u.username, u.name, u.avatar_url
            ORDER BY c.updated_at DESC
            LIMIT 12`
      )
      results.collections = collRows
    }

    if (type === 'all' || type === 'bookmarks') {
      const bmRows = await db.execute(
        sql`SELECT b.id, b.url, b.title, b.description,
                   b.favicon_url, b.og_image_url, b.screenshot_url,
                   b.public_slug, b.created_at,
                   u.username, u.name as user_name, u.avatar_url
            FROM bookmarks b
            JOIN users u ON u.id = b.user_id
            WHERE b.is_public = true AND b.public_slug IS NOT NULL
            ORDER BY b.created_at DESC
            LIMIT 24`
      )
      results.bookmarks = bmRows
    }

    return c.json({ data: results, error: null })
  } catch (err) {
    console.error('[Explore]', err)
    return c.json({
      data:  null,
      error: { code: 'SERVER_ERROR', message: 'Something went wrong' }
    }, 500)
  }
})

// ─────────────────────────────────────────────
// GET /p/:username — public profile
// ─────────────────────────────────────────────

publicRouter.get('/:username/topic/:slug', async (c) => {
  const username = c.req.param('username').toLowerCase()
  const slug     = c.req.param('slug')

  try {
    // 1. Find user
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (!user) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
    }

    // 2. Find topic
    const topic = await db.query.topics.findFirst({
      where: and(
        eq(topics.userId,   user.id),
        eq(topics.slug,     slug),
        eq(topics.isPublic, true),
      ),
    })

    if (!topic) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)
    }

    // 3. Blocks
    const blocks = await db
      .select()
      .from(topicBlocks)
      .where(eq(topicBlocks.topicId, topic.id))
      .orderBy(topicBlocks.order)

    // 4. References
    const refs = await db
      .select()
      .from(topicReferences)
      .where(eq(topicReferences.topicId, topic.id))

    // 5. Bookmark data for each reference
    const bookmarkIds = refs.map(r => r.bookmarkId)
    const refBookmarks = bookmarkIds.length > 0
      ? await db.query.bookmarks.findMany({
          where: inArray(bookmarks.id, bookmarkIds),
          with:  { bookmarkTags: { with: { tag: true } } },
        })
      : []

    const bmMap = Object.fromEntries(refBookmarks.map(b => [b.id, b]))

    // 6. Connections to other public topics
    const conns = await db
      .select({
        toTopicId: topicConnections.toTopicId,
        label:     topicConnections.label,
      })
      .from(topicConnections)
      .where(eq(topicConnections.fromTopicId, topic.id))

    const connTopicIds = conns.map(c => c.toTopicId)
    const connTopics = connTopicIds.length > 0
      ? await db
          .select({
            id:       topics.id,
            title:    topics.title,
            emoji:    topics.emoji,
            slug:     topics.slug,
            isPublic: topics.isPublic,
          })
          .from(topics)
          .where(inArray(topics.id, connTopicIds))
      : []

    const connMap = Object.fromEntries(connTopics.map(t => [t.id, t]))

    return c.json({
      data: {
        author: {
          username: user.username,
          name:     user.name,
        },
        topic: {
          id:         topic.id,
          title:      topic.title,
          emoji:      topic.emoji,
          summary:    topic.summary,
          coverColor: topic.coverColor,
          slug:       topic.slug,
          updatedAt:  topic.updatedAt,
          blocks: blocks.map(b => ({
            id:       b.id,
            type:     b.type,
            content:  b.content,
            metadata: b.metadata,
            order:    b.order,
          })),
          references: refs.map(r => {
            const bm = bmMap[r.bookmarkId]
            if (!bm) return null
            return {
              bookmarkId: r.bookmarkId,
              note:       r.note,
              bookmark: {
                id:          bm.id,
                url:         bm.url,
                title:       bm.title,
                description: bm.description,
                faviconUrl:  bm.faviconUrl,
                tags:        bm.bookmarkTags.map(bt => bt.tag),
              },
            }
          }).filter(Boolean),
          connections: conns
            .map(conn => {
              const t = connMap[conn.toTopicId]
              if (!t || !t.isPublic || !t.slug) return null
              return {
                topicId: t.id,
                title:   t.title,
                emoji:   t.emoji,
                slug:    t.slug,
                label:   conn.label,
              }
            })
            .filter(Boolean),
        },
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public topic] Error:', err)
    return c.json({
      data:  null,
      error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
    }, 500)
  }
})

// ─────────────────────────────────────────────
// GET /p/:username/collection/:slug
// ─────────────────────────────────────────────

publicRouter.get('/:username/collection/:slug', async (c) => {
  const username = c.req.param('username').toLowerCase()
  const slug     = c.req.param('slug')

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (!user) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
    }

    const collection = await db.query.collections.findFirst({
      where: and(
        eq(collections.userId,   user.id),
        eq(collections.slug,     slug),
        eq(collections.isPublic, true),
      ),
    })

    if (!collection) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Collection not found' } }, 404)
    }

    // Get bookmark IDs in this collection
    const bcRows = await db
      .select({ bookmarkId: bookmarkCollections.bookmarkId })
      .from(bookmarkCollections)
      .where(eq(bookmarkCollections.collectionId, collection.id))

    const bookmarkIds = bcRows.map(r => r.bookmarkId)

    const bookmarkItems = bookmarkIds.length > 0
      ? await db.query.bookmarks.findMany({
          where: inArray(bookmarks.id, bookmarkIds),
          with:  { bookmarkTags: { with: { tag: true } } },
        })
      : []

    return c.json({
      data: {
        author: { username: user.username, name: user.name },
        collection: {
          id:          collection.id,
          name:        collection.name,
          icon:        collection.icon,
          color:       collection.color,
          description: collection.description,
          slug:        collection.slug,
        },
        bookmarks: bookmarkItems.map(b => ({
          id:          b.id,
          url:         b.url,
          title:       b.title,
          description: b.description,
          faviconUrl:  b.faviconUrl,
          ogImageUrl:  b.ogImageUrl,
          tags:        b.bookmarkTags.map(bt => bt.tag),
          createdAt:   b.createdAt,
        })),
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public collection] Error:', err)
    return c.json({
      data:  null,
      error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
    }, 500)
  }
})


// ─────────────────────────────────────────────
// GET /p/explore — public discovery feed
// MUST be registered before /:username
// ─────────────────────────────────────────────

publicRouter.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase()

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (!user) {
      return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
    }

    const publicTopics = await db
      .select({
        id:         topics.id,
        title:      topics.title,
        emoji:      topics.emoji,
        summary:    topics.summary,
        coverColor: topics.coverColor,
        slug:       topics.slug,
        updatedAt:  topics.updatedAt,
      })
      .from(topics)
      .where(and(eq(topics.userId, user.id), eq(topics.isPublic, true)))

    const publicCollections = await db
      .select({
        id:          collections.id,
        name:        collections.name,
        icon:        collections.icon,
        color:       collections.color,
        description: collections.description,
        slug:        collections.slug,
      })
      .from(collections)
      .where(and(eq(collections.userId, user.id), eq(collections.isPublic, true)))

    return c.json({
      data: {
        user:        { username: user.username, name: user.name },
        topics:      publicTopics,
        collections: publicCollections,
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public profile] Error:', err)
    return c.json({
      data:  null,
      error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
    }, 500)
  }
})

// ─────────────────────────────────────────────
// GET /p/b/:slug — public bookmark page
// ─────────────────────────────────────────────

export default publicRouter
