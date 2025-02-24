import { useChat } from '@ai-sdk/react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { MeetingChat } from './chat'
import { retrieveMeeting } from '@/app/actions'

const paramsSchema = z.object({
  meetingId: z.coerce.number().int().positive(),
})

export const dynamic = 'force-dynamic'

export default async function MeetingPage({
  params,
}: {
  params: Promise<unknown>
}) {
  const paramsParsed = paramsSchema.safeParse(await params)

  if (!paramsParsed.success) return notFound()

  const meeting = await retrieveMeeting({
    meetingId: paramsParsed.data.meetingId,
  })

  if (!meeting) return notFound()

  return <MeetingChat meeting={meeting} />
}
