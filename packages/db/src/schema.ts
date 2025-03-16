import { relations, sql } from 'drizzle-orm'
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const meetingTable = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),

  filename: text('filename').notNull(),

  short_summary: text('short_summary').notNull(),

  transcription: text('transcription').notNull(),
  duration_ms: integer('duration_ms').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const meetingRelations = relations(meetingTable, ({ many }) => ({
  participants: many(participantTable),
  meetingSessions: many(meetingSessionTable),
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

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export const meetingSessionTable = sqliteTable('meeting_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull(),
})

export const meetingSessionRelations = relations(
  meetingSessionTable,
  ({ one }) => ({
    meeting: one(meetingTable, {
      fields: [meetingSessionTable.meetingId],
      references: [meetingTable.id],
    }),
  })
)
