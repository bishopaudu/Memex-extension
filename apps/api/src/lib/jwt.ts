import { SignJWT, jwtVerify } from 'jose'

// Convert secret string to Uint8Array (what jose requires)
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

// Token expires in 30 days
// Why 30 days? Long enough that users don't get logged out constantly.
// The session table lets us revoke tokens server-side at any time.
const EXPIRY = '30d'

export async function signToken(payload: Record<string, string>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    // Token invalid, expired, or tampered with
    return null
  }
}
