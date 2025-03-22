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
import { generateObject } from 'ai'
import { z } from 'zod'
import { googleLLMProvider, llmModel } from '@/app/api/chat/route'

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
  isSemanticSearch,
}: Pick<MeetingsSearchParams, 'date_from' | 'date_to' | 'search'> & {
  isSemanticSearch: boolean
}) => {
  return and(
    date_from
      ? gte(meetingTable.created_at, date_from.toISOString())
      : undefined,
    date_to ? lte(meetingTable.created_at, date_to.toISOString()) : undefined,
    search && !isSemanticSearch
      ? like(meetingTable.transcription, `%${search}%`)
      : undefined
  )
}

const SEMANTIC_SEARCH_ITEMS_LIMIT = 250

export const paginateMeetings = async ({
  page,
  limit,
  date_from,
  date_to,
  search,
  semantic_search_enabled,
}: MeetingsSearchParams) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return

  const mode = semantic_search_enabled && !!search ? 'semantic' : 'normal'

  const isSemanticSearch = mode === 'semantic'

  const paginationParams = {
    limit: isSemanticSearch ? SEMANTIC_SEARCH_ITEMS_LIMIT : limit,
    offset: isSemanticSearch ? 0 : (page - 1) * limit,
    page: isSemanticSearch ? 1 : page,
  }

  const filters = getMeetingFilters({
    date_from,
    date_to,
    search,
    isSemanticSearch,
  })

  const result = await db.query.meetingTable.findMany({
    columns: {
      id: true,
      summary: true,
      title: true,
      filename: true,
      created_at: true,
      duration_ms: true,
    },
    limit: paginationParams.limit,
    offset: paginationParams.offset,
    with: {
      participants: true,
    },
    where: filters,
  })

  if (isSemanticSearch) {
    const prompt = `
      You are a super intelligent assistant that can search through the title and summary of a list of meetings and return the most relevant results performing a semantic and meaningful search.
  
      The meetings are:
  
      ${JSON.stringify(
        result.map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          summary: meeting.summary,
          participants: meeting.participants,
        }))
      )}
  
      The search query is: ${search}
  
      Return up to 5 results ordered by relevance. Don't try to make up results, only return the ones that are most relevant.
  
      If there are no relevant results, return an empty array in semantic_search_results array list
      `

    const { object: semanticSearchResult, usage } = await generateObject({
      model: llmModel,
      schema: z.object({
        semantic_search_results: z.array(
          z.object({
            id: z.number(),
            match_reason: z.string(),
          })
        ),
      }),
      prompt,
    })

    console.log(
      JSON.stringify(
        {
          prompt,
          usage,
          search,
          candidates_count: result.length,
        },
        null,
        2
      ),
      'Sematic search usage'
    )

    const hydratedMatches = semanticSearchResult.semantic_search_results
      .map((hit) => {
        const meeting = result.find((m) => m.id === hit.id)

        if (!meeting) return null

        return meeting
      })
      .filter(Boolean)

    return {
      data: hydratedMatches,
      metadata: {
        total: hydratedMatches.length,
        page: paginationParams.page,
        limit: paginationParams.limit,
      },
    }
  }

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
