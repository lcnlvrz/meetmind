import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

export interface DatabaseClientOpts {
  url: string
  authToken: string
}

export const createDatabaseClient = (opts: DatabaseClientOpts) => {
  const turso = createClient({
    url: opts.url,
    authToken: opts.authToken,
  })

  return drizzle(turso)
}

export type DatabaseClient = Awaited<ReturnType<typeof createDatabaseClient>>
