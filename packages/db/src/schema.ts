import { sql } from 'drizzle-orm'
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const transcriptionTable = sqliteTable('transcription', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transcription: text('transcription').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})
