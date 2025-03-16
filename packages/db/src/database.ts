import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from 'db'

export interface DatabaseClientOpts {
  url: string
  authToken: string
}

export const createDatabaseClient = (opts: DatabaseClientOpts) => {
  const turso = createClient({
    url: opts.url,
    authToken: opts.authToken,
  })

  return drizzle(turso, {
    schema,
  })
}

export type DatabaseClient = Awaited<ReturnType<typeof createDatabaseClient>>
