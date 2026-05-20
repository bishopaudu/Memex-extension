import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL

// Fail loudly at startup if env is missing
// Better to crash immediately than get a confusing error later
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

console.log('🔌 Connecting to:', DATABASE_URL)

const client = postgres(DATABASE_URL, {
  max: 10,
})

export const db = drizzle(client, { schema })
export * from './schema'
