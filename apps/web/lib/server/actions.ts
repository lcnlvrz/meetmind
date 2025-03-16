'use server'
import '../../env'
import { and, count, eq, gte, ilike, like, lte, SQL } from 'drizzle-orm'
import { db } from './db'
import { meetingSessionTable, meetingTable, participantTable } from 'db/schema'
import { MeetingsSearchParams } from '../../app/dashboard/meetings/search-params'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import crypto from 'crypto'

const generateToken = (length = 64) =>
  crypto.randomBytes(length).toString('hex')

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
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return

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

export type PaginateMeetingsResponseBody = NonNullable<
  Awaited<ReturnType<typeof paginateMeetings>>
>

export const retrieveMeeting = async ({
  meetingId,
  session,
  token,
}: {
  meetingId: number
  session?: Awaited<ReturnType<typeof auth.api.getSession>>
  token?: string | null
}) => {
  if (!session && !token) return

  const getMeeting = () => {
    if (session)
      return db.query.meetingTable.findFirst({
        where: eq(meetingTable.id, meetingId),
        with: {
          participants: true,
        },
      })

    return db.query.meetingSessionTable
      .findFirst({
        where: and(
          eq(meetingSessionTable.meetingId, meetingId),
          eq(meetingSessionTable.token, token!)
        ),
        with: {
          meeting: {
            with: {
              participants: true,
            },
          },
        },
      })
      .then((res) => res?.meeting)
  }

  const meeting = await getMeeting()

  if (!meeting) return

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

export const createMeetingShareToken = async ({
  meetingId,
}: {
  meetingId: number
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return

  const meeting = await db.query.meetingTable.findFirst({
    where: eq(meetingTable.id, meetingId),
  })

  if (!meeting) return

  const token = generateToken()

  await db.insert(meetingSessionTable).values({
    meetingId: meeting.id,
    token,
    createdAt: new Date(),
  })

  return {
    token,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/meeting/${meeting.id}?token=${token}`,
  }
}

export type RetrieveMeetingResponseBody = NonNullable<
  Awaited<ReturnType<typeof retrieveMeeting>>
>
