import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { uploadScreenshot } from '../lib/storage'

const uploadRouter = new Hono<{
  Variables: { userId: string; userEmail: string }
}>()

uploadRouter.use('*', authMiddleware)

const uploadSchema = z.object({
  // base64 data URL — "data:image/png;base64,iVBORw0..."
  imageDataUrl: z.string().startsWith('data:image/'),
})

// POST /upload/screenshot
// Receives base64 screenshot from extension
// Uploads to Cloudinary, returns the public URL
uploadRouter.post('/screenshot', zValidator('json', uploadSchema), async (c) => {
  const userId = c.get('userId')
  const { imageDataUrl } = c.req.valid('json')

  const result = await uploadScreenshot(imageDataUrl, userId)

  if (!result) {
    return c.json({
      data:  null,
      error: { code: 'UPLOAD_FAILED', message: 'Screenshot upload failed' }
    }, 500)
  }

  return c.json({
    data: {
      url:      result.url,      // ← goes into bookmarks.screenshot_url
      publicId: result.publicId, // ← goes into bookmarks.screenshot_key
    },
    error: null,
  })
})

export default uploadRouter
