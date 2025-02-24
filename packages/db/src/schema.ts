import { sql } from 'drizzle-orm'
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const meetingTable = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),

  transcription: text('transcription').notNull(),
  duration_ms: integer('duration_ms').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export type Meeting = typeof meetingTable.$inferSelect

export type InsertMeeting = typeof meetingTable.$inferInsert
