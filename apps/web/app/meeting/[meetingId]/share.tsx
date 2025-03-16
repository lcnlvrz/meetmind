'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy, Forward, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCallback, useState } from 'react'
import { createMeetingShareToken } from '@/lib/server/actions'
import { Input } from '@/components/ui/input'

const CopyToClipboardButton = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }, [url])

  return (
    <Button onClick={handleCopy} variant='outline' size='icon'>
      {copied ? <Check className='size-3' /> : <Copy className='size-3' />}
    </Button>
  )
}

export const ShareMeetingButton = ({ meetingId }: { meetingId: number }) => {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleShare = useCallback(() => {
    setIsLoading(true)

    createMeetingShareToken({
      meetingId,
    })
      .then((res) => {
        if (res) {
          setUrl(res.url)
        }
      })
      .finally(() => setIsLoading(false))
  }, [meetingId])

  return (
    <Dialog
      open={!!url}
      onOpenChange={(open) => {
        if (!open) {
          setUrl('')
        }
      }}
    >
      <Button disabled={isLoading} onClick={handleShare} variant='outline'>
        {isLoading ? (
          <Loader2 className='size-3 animate-spin' />
        ) : (
          <Forward className='size-3' />
        )}
        Compartir
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir reunion</DialogTitle>
          <DialogDescription>
            Copia el siguiente enlace y compártelo con tus colegas:
          </DialogDescription>
          <div className='!mt-5'>
            <div className='flex flex-row items-center space-x-2'>
              <Input readOnly value={url} className='cursor-pointer' />
              <CopyToClipboardButton url={url} />
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
