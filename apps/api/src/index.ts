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
import attachmentsRouter from './routes/attachments'

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
app.route('/api/attachments', attachmentsRouter)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.onError((err, c) => {
  console.error('[Error]', err)
  if (err instanceof HTTPException) {
    return c.json({ data: null, error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  return c.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500)
})

app.notFound((c) =>
  c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
)

const PORT = parseInt(process.env.PORT ?? '3001')

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 Memex API running at http://localhost:${info.port}`)
})

export default app
