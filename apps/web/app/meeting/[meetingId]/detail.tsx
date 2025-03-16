import { ArrowLeftIcon, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { ShareMeetingButton } from './share'
import { RetrieveMeetingResponseBody } from '@/lib/server/actions'
import { msToMinutes } from '@/lib/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { auth } from '@/auth'
import { Logo } from '@/components/logo'

export const MeetingDetail = ({
  meeting,
  session,
}: {
  meeting: RetrieveMeetingResponseBody
  session?: Awaited<ReturnType<typeof auth.api.getSession>>
}) => {
  return (
    <div className='space-y-4'>
      {session ? (
        <div className='flex flex-row items-center justify-between'>
          <Link
            href='/dashboard/meetings'
            className='text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-2'
          >
            <ArrowLeftIcon className='w-3 h-3' />
            <span>Volver a meetings</span>
          </Link>
          <ShareMeetingButton meetingId={meeting.id} />
        </div>
      ) : (
        <div className='w-full flex items-start'>
          <Logo className='w-24' />
        </div>
      )}

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
  )
}
