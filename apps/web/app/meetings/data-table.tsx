'use client'

import { DataTable } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaginationDynamic } from '@/components/ui/pagination'
import { msToMinutes } from '@/lib/utils'
import { Meeting } from '@meetmind/db'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { PaginateMeetingsResponseBody } from '../actions'
import {
  meetingSearchParamsParsers,
  MeetingsSearchParams,
} from './search-params'
import { useQueryStates } from 'nuqs'
import { DatePickerWithRange } from '@/components/ui/date-range'
import { Input } from '@/components/ui/input'
//@ts-ignore
import * as debounce from 'lodash.debounce'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const MeetingsDataTable = ({
  data,
}: {
  data: PaginateMeetingsResponseBody
}) => {
  const columns: ColumnDef<Meeting>[] = [
    {
      header: 'Fecha',
      accessorKey: 'created_at',
    },
    {
      header: 'Duración',
      accessorFn: (row) => `${msToMinutes(row.duration_ms)} minutos`,
    },
    {
      header: 'Titulo',
      accessorKey: 'title',
    },
    {
      header: 'Resumen',
      accessorKey: 'summary',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreHorizontal className='h-4 w-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <Link href={`/meetings/${row.original.id}`}>
                <DropdownMenuItem>Q&A</DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const [filters, setFilters] = useQueryStates(meetingSearchParamsParsers, {
    shallow: false,
  })

  const handleSearch = useCallback(
    debounce((value: string) => {
      setFilters((prev) => ({
        ...prev,
        search: value,
      }))
    }, 500),
    []
  )

  return (
    <div className='space-y-4'>
      <div className='flex flex-row items-center justify-between'>
        <div className='flex flex-row items-center space-x-2'>
          <Input
            placeholder='Buscar...'
            defaultValue={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <DatePickerWithRange
            defaultValue={{
              from: filters.date_from ? new Date(filters.date_from) : undefined,
              to: filters.date_to ? new Date(filters.date_to) : undefined,
            }}
            onChange={(date) =>
              setFilters((prev) => ({
                ...prev,
                date_from: date?.from || null,
                date_to: date?.to || null,
              }))
            }
          />
        </div>

        <Select
          defaultValue={filters.limit.toString()}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              limit: parseInt(value),
            }))
          }
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Items' />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30].map((limit) => (
              <SelectItem key={limit} value={limit.toString()}>
                {limit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data.data} />
      <PaginationDynamic
        total={data.metadata.total}
        limit={filters.limit}
        page={filters.page}
        onPageChange={(page) =>
          setFilters((prev) => ({
            ...prev,
            page,
          }))
        }
      />
    </div>
  )
}
