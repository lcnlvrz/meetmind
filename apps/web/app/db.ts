import { createDatabaseClient } from '@meetmind/db'

export const db = createDatabaseClient({
  authToken: process.env.TURSO_AUTH_TOKEN! || 'sample',
  url: process.env.TURSO_DATABASE_URL! || 'file:./db.sqlite',
})

console.log('db server!')
