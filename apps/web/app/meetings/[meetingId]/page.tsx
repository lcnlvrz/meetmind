import { useChat } from '@ai-sdk/react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { MeetingChat } from './chat'
import { retrieveMeeting } from '@/app/actions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TranscriptionViewer } from '@/components/transcription-viewer'

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

  const lines = meeting.transcription.split('\n')

  return (
    <div className='flex flex-col items-center justify-center'>
      <div className='flex flex-row space-x-2 max-w-[100rem]'>
        <div className='flex flex-col space-y-2 w-[70%]'>
          <video className='w-full' controls src={meeting.videoUrl} />
          <div className='bg-zinc-800 p-4 rounded-md'>
            <h2 className='font-bold text-lg'>Meeting Transcript</h2>
            <ScrollArea className='h-[20vh]'>
              <TranscriptionViewer transcription={meeting.transcription} />
            </ScrollArea>
          </div>
        </div>
        <div className='bg-zinc-800 rounded-md w-[30%] p-4'>
          <MeetingChat meeting={meeting} />
        </div>
      </div>
    </div>
  )
}
