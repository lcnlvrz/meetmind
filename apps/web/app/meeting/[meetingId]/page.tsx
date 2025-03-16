import { useChat } from '@ai-sdk/react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { MeetingChat } from './chat'
import { retrieveMeeting } from '@/lib/server/actions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TranscriptionViewer } from '@/components/transcription-viewer'
import { MeetingDetail } from './detail'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { Globe } from 'lucide-react'
import { Logo } from '@/components/logo'

const paramsSchema = z.object({
  meetingId: z.coerce.number().int().positive(),
})

const searchParamsSchema = z.object({
  token: z.string().nullish(),
})

export const dynamic = 'force-dynamic'

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<unknown>
  searchParams: Promise<unknown>
}) {
  const paramsParsed = paramsSchema.safeParse(await params)

  if (!paramsParsed.success) return notFound()

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const searchParamsParsed = searchParamsSchema.safeParse(await searchParams)

  if (!searchParamsParsed.success) return notFound()

  const meeting = await retrieveMeeting({
    token: searchParamsParsed.data.token,
    meetingId: paramsParsed.data.meetingId,
    session,
  })

  if (!meeting) return notFound()

  return (
    <div className='p-12 space-y-4'>
      <div className='flex items-center justify-center'>
        <div className='flex flex-col items-center justify-center h-[calc(100vh-10rem)]'>
          <div className='flex flex-row space-x-2 max-w-[100rem] h-full'>
            <div className='flex flex-col space-y-2 w-[70%]'>
              <video className='w-full' controls src={meeting.videoUrl} />
              <h2 className='font-bold text-lg'>Meeting Transcript</h2>
              <ScrollArea className='bg-zinc-800 p-4 rounded-md'>
                <TranscriptionViewer transcription={meeting.transcription} />
              </ScrollArea>
            </div>
            <div className='bg-zinc-800 rounded-md w-[30%] p-4 flex flex-col'>
              <MeetingDetail meeting={meeting} session={session} />
              <MeetingChat
                token={searchParamsParsed.data.token}
                meeting={meeting}
              />
            </div>
          </div>
        </div>
      </div>

      <footer className='w-full flex items-center justify-center h-10'>
        <div className='flex flex-col text-center'>
          <p className='text-sm text-gray-500 font-semibold'>
            Made by{' '}
            <a href='https://github.com/lcnlvrz' target='_blank'>
              Luciano Alvarez
            </a>{' '}
          </p>
          <div className='flex flex-row items-center space-x-1'>
            <p className='text-xs text-gray-500'>
              Deployed on raspberry pi 5 from Tucuman, Argentina
            </p>
            <Globe className='size-3 text-gray-500' />
          </div>
        </div>
      </footer>
    </div>
  )
}
