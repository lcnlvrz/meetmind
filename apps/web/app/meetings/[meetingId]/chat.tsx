'use client'
import { RetrieveMeetingResponseBody } from '@/app/actions'
import { ChatMessageRequestBody } from '@/app/api/chat/route'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { msToMinutes } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { formatInTimeZone } from 'date-fns-tz'
import { date } from 'drizzle-orm/mysql-core'
import { ArrowLeftIcon, Calendar, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const MeetingChat = ({
  meeting,
}: {
  meeting: RetrieveMeetingResponseBody
}) => {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    body: {
      meetingId: meeting.id,
    } satisfies Omit<ChatMessageRequestBody, 'messages'>,
  })

  return (
    <div className='flex flex-col w-full h-full justify-between'>
      <div>
        <Link
          href='/meetings'
          className='mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-2'
        >
          <ArrowLeftIcon className='w-3 h-3' />
          <span>Volver a meetings</span>
        </Link>
        <div className='mb-8 space-y-4'>
          <div className='space-y-2'>
            <h1 className='text-2xl font-bold'>{meeting.title}</h1>
            <div className='flex flex-row space-x-4'>
              <div className='flex flex-row items-center space-x-1'>
                <Clock className='size-4' />
                <p className='text-muted-foreground text-xs'>
                  {msToMinutes(meeting.duration_ms)} minutos
                </p>
              </div>

              <div className='flex flex-row items-center space-x-1'>
                <Calendar className='size-4' />
                <p className='text-muted-foreground text-xs'>
                  {formatInTimeZone(
                    new Date(meeting.created_at),
                    'America/Argentina/Buenos_Aires',
                    'dd/MM/yyyy'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <p className='text-sm'>Resumen</p>
            <div className='text-gray-500 text-sm'>
              <p>{meeting.short_summary}</p>
            </div>
          </div>

          <div className='space-y-2'>
            <p className='text-sm'>Participantes</p>
            <div className='text-gray-500 text-sm flex flex-row flex-wrap gap-5'>
              {meeting.participants.map((p) => (
                <p key={p.id}>{p.name}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className='space-y-4 max-h-[50vh] flex flex-col'>
        <div className='flex flex-col space-y-4'>
          {messages.map((m) => (
            <div key={m.id} className='whitespace-pre-wrap'>
              <div>
                <div className='font-bold'>{m.role}</div>
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit}>
        <div className='flex flex-row gap-2 relative'>
          <Textarea
            className='w-full p-2 border border-gray-300 rounded-md shadow-xl h-full'
            value={input}
            placeholder='Resumir, encontrar puntos claves, etc...'
            onChange={handleInputChange}
          />
          <div className='absolute top-0 right-0 p-2'>
            <Button type='submit'>
              {status === 'submitted' && (
                <Loader2 className='size-4 animate-spin' />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
