import { type ImageProps } from 'next/image'
import { paginateMeetings } from '../actions'
import { MeetingsDataTable } from './data-table'
import { loadSearchParams } from './search-params'
import { SearchParams } from 'nuqs/server'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await loadSearchParams(searchParams)

  const data = await paginateMeetings(filters)

  return (
    <div className='space-y-5 p-14'>
      <h2 className='text-2xl font-bold'>Meetings</h2>
      <MeetingsDataTable data={data} />
    </div>
  )
}
