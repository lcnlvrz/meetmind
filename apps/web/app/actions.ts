import { and, count, eq, gte, ilike, like, lte, SQL } from 'drizzle-orm'
import { db } from './db'
import { meetingTable } from '@meetmind/db'
import { MeetingsSearchParams } from './meetings/search-params'

const getMeetingFilters = ({
  date_from,
  date_to,
  search,
}: Pick<MeetingsSearchParams, 'date_from' | 'date_to' | 'search'>) => {
  return and(
    date_from
      ? gte(meetingTable.created_at, date_from.toISOString())
      : undefined,
    date_to ? lte(meetingTable.created_at, date_to.toISOString()) : undefined,
    search ? like(meetingTable.transcription, `%${search}%`) : undefined
  )
}

export const paginateMeetings = async ({
  page,
  limit,
  date_from,
  date_to,
  search,
}: MeetingsSearchParams) => {
  console.log('search', search)

  const filters = getMeetingFilters({ date_from, date_to, search })

  const result = await db
    .select()
    .from(meetingTable)
    .where(filters)
    .limit(limit)
    .offset((page - 1) * limit)

  const [total] = await db
    .select({ count: count() })
    .from(meetingTable)
    .where(filters)

  return {
    data: result,
    metadata: {
      total: total!.count,
      page,
      limit,
    },
  }
}

export type PaginateMeetingsResponseBody = Awaited<
  ReturnType<typeof paginateMeetings>
>

export const retrieveMeeting = async ({ meetingId }: { meetingId: number }) => {
  const results = await db
    .select()
    .from(meetingTable)
    .where(eq(meetingTable.id, meetingId))
    .limit(1)

  const [result] = results

  return result
}

export type RetrieveMeetingResponseBody = NonNullable<
  Awaited<ReturnType<typeof retrieveMeeting>>
>
