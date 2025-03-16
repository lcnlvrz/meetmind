import { relations, sql } from 'drizzle-orm'
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const meetingTable = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),

  short_summary: text('short_summary').notNull(),

  transcription: text('transcription').notNull(),
  duration_ms: integer('duration_ms').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const meetingRelations = relations(meetingTable, ({ many }) => ({
  participants: many(participantTable),
}))

export const participantTable = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  meeting_id: integer('meeting_id').references(() => meetingTable.id),
})

export const participantRelations = relations(participantTable, ({ one }) => ({
  meeting: one(meetingTable, {
    fields: [participantTable.meeting_id],
    references: [meetingTable.id],
  }),
}))

export type Meeting = typeof meetingTable.$inferSelect

export type InsertMeeting = typeof meetingTable.$inferInsert

export type Participant = typeof participantTable.$inferSelect

export type InsertParticipant = typeof participantTable.$inferInsert
