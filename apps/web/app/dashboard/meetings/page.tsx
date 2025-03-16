import { Globe } from 'lucide-react'
import { SearchParams } from 'nuqs/server'
import { paginateMeetings } from '../../../lib/server/actions'
import { MeetingsDataTable } from './data-table'
import { loadSearchParams } from './search-params'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await loadSearchParams(searchParams)

  const data = await paginateMeetings(filters)

  if (!data) return notFound()

  return (
    <div className='space-y-5 min-h-screen flex flex-col justify-between'>
      <div className='space-y-2'>
        <h2 className='text-2xl font-bold'>Meetings</h2>
        <MeetingsDataTable data={data} />
      </div>
    </div>
  )
}
