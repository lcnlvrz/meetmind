import { createDatabaseClient } from '@meetmind/db'

export const db = createDatabaseClient({
  authToken: process.env.TURSO_AUTH_TOKEN!,
  url: process.env.TURSO_DATABASE_URL!,
})

console.log('db server!')
