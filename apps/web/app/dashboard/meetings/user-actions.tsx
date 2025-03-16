'use client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { Session } from 'better-auth'
import { session } from 'db/schema'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const UserActions = ({
  session,
}: {
  session: ReturnType<typeof authClient.getSession>
}) => {
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    await authClient.signOut()

    router.push('/auth/login')
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
