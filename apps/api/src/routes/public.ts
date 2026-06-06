import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db'

export const publicRouter = new Hono()

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

publicRouter.get('/:username/topic/:slug', async (c) => {
  const username = c.req.param('username').toLowerCase()
  const slug     = c.req.param('slug')
  try {
    const userRows = await db.execute(sql`SELECT id, username, name FROM users WHERE username = ${username} LIMIT 1`)
    const user = (userRows as any)[0] ?? null
    if (!user) return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

    const topicRows = await db.execute(sql`SELECT * FROM topics WHERE user_id = ${user.id}::uuid AND slug = ${slug} AND is_public = true LIMIT 1`)
    const topic = (topicRows as any)[0] ?? null
    if (!topic) return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Topic not found' } }, 404)

    const blockRows  = await db.execute(sql`SELECT * FROM topic_blocks WHERE topic_id = ${topic.id}::uuid ORDER BY "order" ASC`)
    const refRows    = await db.execute(sql`SELECT * FROM topic_references WHERE topic_id = ${topic.id}::uuid`)
    const refArr     = refRows as any[]
    const connRows   = await db.execute(sql`SELECT tc.to_topic_id, t.title, t.emoji, t.slug FROM topic_connections tc JOIN topics t ON t.id = tc.to_topic_id WHERE tc.from_topic_id = ${topic.id}::uuid AND t.is_public = true AND t.slug IS NOT NULL`)

    let refBookmarks: any[] = []
    if (refArr.length > 0) {
      const ids = refArr.map((r: any) => r.bookmark_id)
      refBookmarks = await db.execute(sql`SELECT b.id, b.url, b.title, b.description, b.favicon_url, COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags FROM bookmarks b LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id LEFT JOIN tags t ON t.id = bt.tag_id WHERE b.id = ANY(${ids}::uuid[]) GROUP BY b.id`) as any[]
    }
    const refMap = Object.fromEntries((refBookmarks as any[]).map((b: any) => [b.id, b]))

    return c.json({
      data: {
        author: { username: user.username, name: user.name },
        topic: {
          id: topic.id, title: topic.title, emoji: topic.emoji,
          summary: topic.summary, coverColor: topic.cover_color,
          slug: topic.slug, updatedAt: topic.updated_at,
          blocks: (blockRows as any[]).map((b: any) => ({ id: b.id, type: b.type, content: b.content, metadata: b.metadata, order: b.order })),
          references: refArr.map((r: any) => {
            const bm = refMap[r.bookmark_id]
            if (!bm) return null
            return { bookmarkId: r.bookmark_id, note: r.note, bookmark: { id: bm.id, url: bm.url, title: bm.title, description: bm.description, faviconUrl: bm.favicon_url, tags: typeof bm.tags === 'string' ? JSON.parse(bm.tags) : bm.tags } }
          }).filter(Boolean),
          connections: (connRows as any[]).map((conn: any) => ({ topicId: conn.to_topic_id, title: conn.title, emoji: conn.emoji, slug: conn.slug })),
        }
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public topic]', err)
    return c.json({ data: null, error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, 500)
  }
})

publicRouter.get('/:username/collection/:slug', async (c) => {
  const username = c.req.param('username').toLowerCase()
  const slug     = c.req.param('slug')
  try {
    const userRows = await db.execute(sql`SELECT id, username, name FROM users WHERE username = ${username} LIMIT 1`)
    const user = (userRows as any)[0] ?? null
    if (!user) return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

    const collRows = await db.execute(sql`SELECT * FROM collections WHERE user_id = ${user.id}::uuid AND slug = ${slug} AND is_public = true LIMIT 1`)
    const collection = (collRows as any)[0] ?? null
    if (!collection) return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Collection not found' } }, 404)

    const bmRows = await db.execute(sql`SELECT b.id, b.url, b.title, b.description, b.favicon_url, b.og_image_url, b.created_at, COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags FROM bookmarks b JOIN bookmark_collections bc ON bc.bookmark_id = b.id LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id LEFT JOIN tags t ON t.id = bt.tag_id WHERE bc.collection_id = ${collection.id}::uuid GROUP BY b.id ORDER BY b.created_at DESC`)

    return c.json({
      data: {
        author: { username: user.username, name: user.name },
        collection: { id: collection.id, name: collection.name, icon: collection.icon, color: collection.color, description: collection.description, slug: collection.slug },
        bookmarks: (bmRows as any[]).map((b: any) => ({ id: b.id, url: b.url, title: b.title, description: b.description, faviconUrl: b.favicon_url, ogImageUrl: b.og_image_url, tags: typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags, createdAt: b.created_at })),
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public collection]', err)
    return c.json({ data: null, error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, 500)
  }
})

publicRouter.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase()
  try {
    const userRows = await db.execute(sql`SELECT id, username, name FROM users WHERE username = ${username} LIMIT 1`)
    const user = (userRows as any)[0] ?? null
    if (!user) return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

    const topicRows = await db.execute(sql`SELECT id, title, emoji, summary, cover_color, slug, updated_at FROM topics WHERE user_id = ${user.id}::uuid AND is_public = true`)
    const collRows  = await db.execute(sql`SELECT id, name, icon, color, description, slug FROM collections WHERE user_id = ${user.id}::uuid AND is_public = true`)

    return c.json({
      data: {
        user: { username: user.username, name: user.name },
        topics: (topicRows as any[]).map((t: any) => ({ id: t.id, title: t.title, emoji: t.emoji, summary: t.summary, coverColor: t.cover_color, slug: t.slug, updatedAt: t.updated_at })),
        collections: (collRows as any[]).map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, description: c.description, slug: c.slug })),
      },
      error: null,
    })
  } catch (err) {
    console.error('[Public profile]', err)
    return c.json({ data: null, error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, 500)
  }
})

export default publicRouter
