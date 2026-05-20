import { v2 as cloudinary } from 'cloudinary'

// Configure once — reads from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure:     true, // always use https
})

// ─────────────────────────────────────────────
// Upload a base64 screenshot to Cloudinary
//
// Why base64 directly instead of presigned URLs?
// Cloudinary's free tier doesn't support presigned
// direct uploads the same way R2 does. Instead we
// receive the base64 in our API and stream it to
// Cloudinary. The image never touches our disk.
//
// The tradeoff: screenshot bytes pass through our
// API server. Acceptable at indie scale — revisit
// if bandwidth becomes expensive.
// ─────────────────────────────────────────────
export async function uploadScreenshot(
  base64DataUrl: string,
  userId: string
): Promise<{ url: string; publicId: string } | null> {
  try {
    const result = await cloudinary.uploader.upload(base64DataUrl, {
      // Organize uploads by user in Cloudinary's media library
      folder:          `memex/screenshots/${userId}`,

      // Cloudinary auto-generates a unique public_id
      // We store it so we can delete the image later
      resource_type:   'image',

      // Automatically optimize the image on delivery
      // This reduces screenshot size by 40-60% with no visible quality loss
      quality:         'auto',
      fetch_format:    'auto',

      // Limit dimensions — screenshots don't need to be huge
      // 1280px wide is plenty for a thumbnail
      transformation: [
        { width: 1280, crop: 'limit' }
      ],
    })

    return {
      url:      result.secure_url,
      publicId: result.public_id,
    }
  } catch (err) {
    console.error('[Cloudinary] Upload failed:', err)
    return null
  }
}

// ─────────────────────────────────────────────
// Delete a screenshot when its bookmark is deleted
// ─────────────────────────────────────────────
export async function deleteScreenshot(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    // Non-fatal — log and move on
    console.error('[Cloudinary] Delete failed:', publicId, err)
  }
}
