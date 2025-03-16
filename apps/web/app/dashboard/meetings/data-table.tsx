'use client'

import { DataTable } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaginationDynamic } from '@/components/ui/pagination'
import { cn, msToMinutes } from '@/lib/utils'
import { format, formatInTimeZone } from 'date-fns-tz'
import { ColumnDef } from '@tanstack/react-table'
import { MessageSquareText, MoreHorizontal, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PaginateMeetingsResponseBody } from '../../../lib/server/actions'
import {
  meetingSearchParamsParsers,
  MeetingsSearchParams,
} from './search-params'
import { useQueryStates } from 'nuqs'
import { DatePickerWithRange } from '@/components/ui/date-range'
import { Input } from '@/components/ui/input'
//@ts-ignore
import * as debounce from 'lodash.debounce'
import { useCallback, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Meeting = PaginateMeetingsResponseBody['data'][number]

const ChatWithAIButton = () => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Button
      size='sm'
      className={cn(
        'relative overflow-hidden group transition-all duration-300 px-3 py-3',
        'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700',
        'text-white font-medium rounded-xl shadow-lg hover:shadow-xl',
        'flex items-center gap-3'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className='relative z-10 flex items-center gap-2'>
        <MessageSquareText className='w-5 h-5' />
        <span>Chat with AI</span>
        <Sparkles
          className={cn(
            'w-5 h-5 transition-all duration-500',
            isHovered ? 'opacity-100 rotate-12' : 'opacity-70 rotate-0'
          )}
        />
      </span>

      {/* Animated background effect */}
      <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl transform scale-150 opacity-0 group-hover:opacity-100 transition-all duration-700'></span>

      {/* Subtle pulse animation */}
      <span
        className={cn(
          'absolute inset-0 bg-white/10 rounded-xl transform transition-all duration-700',
          isHovered ? 'scale-105 opacity-0' : 'scale-100 opacity-0'
        )}
      ></span>
    </Button>
  )
}

export const MeetingsDataTable = ({
  data,
}: {
  data: PaginateMeetingsResponseBody
}) => {
  const columns: ColumnDef<Meeting>[] = [
    {
      header: 'Fecha',
      accessorKey: 'created_at',
      accessorFn: (row) =>
        formatInTimeZone(
          new Date(row.created_at),
          'America/Argentina/Buenos_Aires',
          'dd/MM/yyyy HH:mm'
        ),
    },
    {
      header: 'Duración',
      accessorFn: (row) => `${msToMinutes(row.duration_ms)} minutos`,
    },
    {
      header: 'Titulo',
      accessorKey: 'title',
      cell: ({ row }) => {
        return (
          <div className='max-w-56 flex flex-row flex-wrap'>
            {row.original.title}
          </div>
        )
      },
    },
    {
      header: 'Resumen',
      accessorKey: 'short_summary',
      cell: ({ row }) => {
        return (
          <div className='max-w-56 flex flex-row flex-wrap'>
            {row.original.short_summary}
          </div>
        )
      },
    },
    {
      header: 'Participantes',
      cell: ({ row }) => {
        return (
          <div className='flex flex-row flex-wrap gap-2'>
            {row.original.participants.map((participant) => {
              return <Badge key={participant.id}>{participant.name}</Badge>
            })}
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <Link href={`/meeting/${row.original.id}`}>
            <ChatWithAIButton />
          </Link>
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
