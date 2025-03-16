'use client'

import type React from 'react'

import { useMemo, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload } from 'lucide-react'

interface Subtitle {
  id: number
  startTime: string
  endTime: string
  text: string
}

const parseSrt = (content: string) => {
  const blocks = content.trim().split(/\n\s*\n/)
  const parsedSubtitles: Subtitle[] = []

  blocks.forEach((block) => {
    const lines = block.trim().split('\n')
    if (lines.length >= 3) {
      const id = Number.parseInt(lines[0])
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
      )

      if (timeMatch) {
        const startTime = timeMatch[1]
        const endTime = timeMatch[2]
        const text = lines.slice(2).join('\n')

        parsedSubtitles.push({
          id,
          startTime,
          endTime,
          text,
        })
      }
    }
  })

  return parsedSubtitles
}
const formatTime = (timeString: string) => {
  return timeString.replace(',', '.')
}

export const TranscriptionViewer = ({
  transcription,
}: {
  transcription: string
}) => {
  const subtitles = useMemo(() => parseSrt(transcription), [transcription])

  return (
    <div className=''>
      {subtitles.map((subtitle) => (
        <div key={subtitle.id} className='pb-3 border-b last:border-b-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-xs font-mono bg-muted dark:bg-slate-800 px-2 py-1 rounded'>
              {formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}
            </span>
            <span className='text-xs text-muted-foreground'>
              #{subtitle.id}
            </span>
          </div>
          <p className='text-sm whitespace-pre-line'>{subtitle.text}</p>
        </div>
      ))}
    </div>
  )
}
