import { and, count, eq, gte, ilike, like, lte, SQL } from 'drizzle-orm'
import { db } from './db'
import { meetingTable, participantTable } from 'db'
import { MeetingsSearchParams } from './meetings/search-params'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

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

  const result = await db.query.meetingTable.findMany({
    limit: limit,
    offset: (page - 1) * limit,
    with: {
      participants: true,
    },
    where: filters,
  })

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
  const meeting = await db.query.meetingTable.findFirst({
    where: eq(meetingTable.id, meetingId),
    with: {
      participants: true,
    },
  })

  if (!meeting) return

  console.log('filename', meeting.id)

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: meeting.filename,
  })

  const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 * 24, // 1 day
  })

  return {
    ...meeting,
    videoUrl: url,
  }
}

export type RetrieveMeetingResponseBody = NonNullable<
  Awaited<ReturnType<typeof retrieveMeeting>>
>
