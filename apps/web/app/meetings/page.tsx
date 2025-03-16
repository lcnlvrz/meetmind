import { type ImageProps } from 'next/image'
import { paginateMeetings } from '../actions'
import { MeetingsDataTable } from './data-table'
import { loadSearchParams } from './search-params'
import { SearchParams } from 'nuqs/server'
import { Suspense } from 'react'
import { Globe } from 'lucide-react'

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

      <footer className='pb-4 w-full flex items-center justify-center'>
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
