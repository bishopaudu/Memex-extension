import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWeeklyDigest(
  toEmail:   string,
  userName:  string,
  bookmarks: { title: string; url: string; domain: string }[],
  topicCount: number,
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY not set — skipping email')
    return
  }

  const bookmarkRows = bookmarks.slice(0, 5).map(b => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #1e1e1e;">
        <a href="${b.url}"
           style="color: #7b93ff; text-decoration: none; font-size: 13px;">
          ${b.title || b.domain}
        </a>
        <span style="color: #555; font-size: 11px; margin-left: 8px;">
          ${b.domain}
        </span>
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="background: #0a0a0a; color: #e2e2e2; font-family: -apple-system,
                 BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">

        <!-- Logo -->
        <div style="margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: #4f6ef7; border-radius: 8px;
                        display: inline-flex; align-items: center; justify-content: center;
                        color: white; font-weight: 700; font-size: 12px;">M</div>
            <span style="font-weight: 600; font-size: 15px;">Memex</span>
          </div>
        </div>

        <!-- Heading -->
        <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #e2e2e2;">
          Your week in knowledge ✨
        </h1>
        <p style="color: #555; font-size: 13px; margin: 0 0 32px;">
          Hi ${userName}, here's what you saved this week
        </p>

        <!-- Stats -->
        <div style="display: flex; gap: 12px; margin-bottom: 32px;">
          <div style="flex: 1; background: #111; border: 1px solid #1e1e1e;
                      border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7b93ff;">
              ${bookmarks.length}
            </div>
            <div style="font-size: 11px; color: #555; margin-top: 4px;">bookmarks saved</div>
          </div>
          <div style="flex: 1; background: #111; border: 1px solid #1e1e1e;
                      border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #10b981;">
              ${topicCount}
            </div>
            <div style="font-size: 11px; color: #555; margin-top: 4px;">wiki topics</div>
          </div>
        </div>

        <!-- Bookmarks -->
        ${bookmarks.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <p style="font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase;
                      letter-spacing: 0.08em; margin: 0 0 12px;">
              Saved this week
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              ${bookmarkRows}
            </table>
            ${bookmarks.length > 5 ? `
              <p style="color: #555; font-size: 11px; margin: 12px 0 0;">
                + ${bookmarks.length - 5} more in your library
              </p>
            ` : ''}
          </div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.APP_URL ?? 'http://localhost:5173'}"
             style="display: inline-block; background: #4f6ef7; color: white;
                    text-decoration: none; padding: 12px 28px; border-radius: 12px;
                    font-size: 13px; font-weight: 600;">
            Open Memex →
          </a>
        </div>

        <!-- Footer -->
        <p style="color: #333; font-size: 11px; text-align: center; margin: 0;">
          Memex · Your visual knowledge base ·
          <a href="${process.env.APP_URL ?? 'http://localhost:5173'}"
             style="color: #444; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `

  try {
    await resend.emails.send({
      from:    'Memex <digest@memex.app>',
      to:      toEmail,
      subject: `Your week in knowledge — ${bookmarks.length} bookmarks saved`,
      html,
    })
    console.log(`[Email] Digest sent to ${toEmail}`)
  } catch (err) {
    console.error('[Email] Failed to send digest:', err)
  }
}
