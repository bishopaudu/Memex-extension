// ─────────────────────────────────────────────
// Crop a base64 image to a region
// region: { x, y, w, h } as 0-1 percentages of the image
// Returns a new base64 PNG of just that region
// ─────────────────────────────────────────────
export function cropImage(
  base64DataUrl: string,
  region: { x: number; y: number; w: number; h: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas  = document.createElement('canvas')
      const ctx     = canvas.getContext('2d')!

      // Convert percentage coordinates to pixel coordinates
      const pixelX = Math.round(region.x * img.width)
      const pixelY = Math.round(region.y * img.height)
      const pixelW = Math.round(region.w * img.width)
      const pixelH = Math.round(region.h * img.height)

      canvas.width  = pixelW
      canvas.height = pixelH

      // Draw just the selected region onto the canvas
      ctx.drawImage(
        img,
        pixelX, pixelY, pixelW, pixelH,  // source rectangle
        0, 0, pixelW, pixelH             // destination rectangle
      )

      resolve(canvas.toDataURL('image/png', 0.9))
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64DataUrl
  })
}
