import { auth } from '@/auth'
import { retrieveMeeting } from '@/lib/server/actions'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

export const maxDuration = 30

const chatMessageRequestBody = z.object({
  meetingId: z.coerce.number().int().positive(),
  messages: z.array(z.any()),
  token: z.string().nullish(),
})

export type ChatMessageRequestBody = z.infer<typeof chatMessageRequestBody>

export async function POST(req: Request) {
  const body = await req.json()

  const parsedBody = chatMessageRequestBody.safeParse(body)

  console.log('parsedBody', parsedBody)

  if (!parsedBody.success)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const meeting = await retrieveMeeting({
    meetingId: parsedBody.data.meetingId,
    token: parsedBody.data.token,
    ...(!parsedBody.data.token
      ? {
          session: await auth.api.getSession({
            headers: await headers(),
          }),
        }
      : {}),
  })

  if (!meeting)
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const result = streamText({
    model: google('gemini-2.0-flash-001'),
    messages: parsedBody.data.messages,
    system: `
    You are a helpful assistant that can answer questions about the meeting.
    The meeting is ${meeting.title} and the summary is ${meeting.summary}.
    The transcript is ${meeting.transcription}.
    `,
  })

  return result.toDataStreamResponse()
}
