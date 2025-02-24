import { retrieveMeeting } from '@/app/actions'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

export const maxDuration = 30

const chatMessageRequestBody = z.object({
  meetingId: z.coerce.number().int().positive(),
  messages: z.array(z.any()),
})

export type ChatMessageRequestBody = z.infer<typeof chatMessageRequestBody>

export async function POST(req: Request) {
  const body = await req.json()

  const parsedBody = chatMessageRequestBody.safeParse(body)

  if (!parsedBody.success)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const meeting = await retrieveMeeting({
    meetingId: parsedBody.data.meetingId,
  })

  if (!meeting)
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const result = streamText({
    model: google('gemini-1.5-flash'),
    messages: parsedBody.data.messages,
    system: `
    You are a helpful assistant that can answer questions about the meeting.
    The meeting is ${meeting.title} and the summary is ${meeting.summary}.
    The transcript is ${meeting.transcription}.
    `,
  })

  return result.toDataStreamResponse()
}
