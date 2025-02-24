'use client'
import { RetrieveMeetingResponseBody } from '@/app/actions'
import { ChatMessageRequestBody } from '@/app/api/chat/route'
import { Markdown } from '@/components/ui/markdown'
import { msToMinutes } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

export const MeetingChat = ({
  meeting,
}: {
  meeting: RetrieveMeetingResponseBody
}) => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: {
      meetingId: meeting.id,
    } satisfies Omit<ChatMessageRequestBody, 'messages'>,
  })

  return (
    <div className='flex flex-col w-full max-w-md py-24 mx-auto stretch'>
      <Link
        href='/meetings'
        className='mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-2'
      >
        <ArrowLeftIcon className='w-3 h-3' />
        <span>Back to meetings</span>
      </Link>
      <div className='mb-8 space-y-2'>
        <h1 className='text-2xl font-bold'>{meeting.title}</h1>
        <p className='text-muted-foreground text-xs'>
          {msToMinutes(meeting.duration_ms)} minutos
        </p>
        {meeting.summary && (
          <div className='text-gray-600'>
            <p>{meeting.summary}</p>
          </div>
        )}
      </div>

      <div className='space-y-4'>
        {messages.map((m) => (
          <div key={m.id} className='whitespace-pre-wrap'>
            <div>
              <div className='font-bold'>{m.role}</div>
              <Markdown>{m.content}</Markdown>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          className='fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl'
          value={input}
          placeholder='Say something...'
          onChange={handleInputChange}
        />
      </form>
    </div>
  )
}
