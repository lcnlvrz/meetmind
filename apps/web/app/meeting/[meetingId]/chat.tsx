'use client'
import { RetrieveMeetingResponseBody } from '@/lib/server/actions'
import { ChatMessageRequestBody } from '@/app/api/chat/route'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { msToMinutes } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { formatInTimeZone } from 'date-fns-tz'
import {
  ArrowLeftIcon,
  Calendar,
  Clock,
  Forward,
  Loader2,
  Share,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useRef } from 'react'
import { ShareMeetingButton } from './share'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const MeetingChat = ({
  meeting,
  token,
}: {
  meeting: RetrieveMeetingResponseBody
  token?: string | null
}) => {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    append,
    setInput,
  } = useChat({
    body: {
      meetingId: meeting.id,
      token,
    } satisfies Omit<ChatMessageRequestBody, 'messages'>,
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = '60px'

    const scrollHeight = textarea.scrollHeight
    textarea.style.height = `${scrollHeight}px`
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        console.log('Enter')

        e.preventDefault()
        append({
          role: 'user',
          content: input,
        })

        setInput('')
      }
    },
    [input]
  )

  return (
    <div className='flex flex-col w-full h-full flex-1 justify-between'>
      <ScrollArea className='space-y-4 max-h-[50vh] flex flex-col'>
        <div className='flex flex-col space-y-4 pb-10 px-4'>
          {messages.map((m) => (
            <div key={m.id} className='whitespace-pre-wrap'>
              <div>
                <div className='flex flex-row items-start space-x-4'>
                  <Avatar>
                    <AvatarImage
                      className='object-cover bg-white'
                      src={m.role === 'assistant' ? '/logo.png' : '/avatar.jpg'}
                    />
                    <AvatarFallback>YOU</AvatarFallback>
                  </Avatar>

                  <div>
                    <Markdown>{m.content}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit}>
        <div className='flex items-start gap-2'>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              adjustTextareaHeight()
              handleInputChange(event)
            }}
            onKeyDown={handleKeyDown}
            placeholder='Resumir, encontrar puntos claves, etc...'
            className='flex-1 min-h-[60px] resize-none overflow-hidden ring-1 ring-ring'
            disabled={status === 'submitted' || status === 'streaming'}
            rows={1}
          />
          <Button type='submit'>
            {status === 'submitted' && (
              <Loader2 className='size-4 animate-spin' />
            )}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}
