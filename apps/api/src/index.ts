import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import authRouter        from './routes/auth'
import bookmarksRouter   from './routes/bookmarks'
import tagsRouter        from './routes/tags'
import uploadRouter      from './routes/upload'
import collectionsRouter from './routes/collections'
import topicsRouter      from './routes/topics'
import searchRouter      from './routes/search'
import attachmentsRouter from './routes/attachments'
import publicRouter      from './routes/public'
import readingRouter     from './routes/reading'
import digestRouter      from './routes/digest'

const app = new Hono()

app.use('*', logger())

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    if (origin.includes('localhost')) return origin
    if (origin.startsWith('chrome-extension://')) return origin
    if (origin.startsWith('moz-extension://')) return origin
    return origin
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
}))

app.route('/api/auth',        authRouter)
app.route('/api/bookmarks',   bookmarksRouter)
app.route('/api/tags',        tagsRouter)
app.route('/api/upload',      uploadRouter)
app.route('/api/collections', collectionsRouter)
app.route('/api/topics',      topicsRouter)
app.route('/api/search',      searchRouter)
app.route('/api/attachments', attachmentsRouter)
app.route('/api/reading',     readingRouter)
app.route('/api/digest',      digestRouter)
app.route('/p',               publicRouter)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.onError((err, c) => {
  console.error('[Error]', err)
  if (err instanceof HTTPException) {
    return c.json({ data: null, error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  return c.json({
    data:  null,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  }, 500)
})

app.notFound((c) =>
  c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
)

const PORT = parseInt(process.env.PORT ?? '3001')

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 Memex API running at http://localhost:${info.port}`)
})

export default app
