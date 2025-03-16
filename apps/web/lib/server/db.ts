import { createDatabaseClient } from 'db'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'

export const db = createDatabaseClient({
  authToken: process.env.TURSO_AUTH_TOKEN! || 'sample',
  url: process.env.TURSO_DATABASE_URL! || 'file:./db.sqlite',
})
