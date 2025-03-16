import { auth } from '@/auth'
import { Logo } from '@/components/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserActions } from './user-actions'

export default async function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return redirect('/auth/login')

  return (
    <>
      <nav className='w-full flex p-4'>
        <div className='flex flex-row items-center w-full justify-between'>
          <div className='[&>svg]:h-10 [&>svg]:fill-white pl-1'>
            <Logo />
          </div>

          <UserActions session={session} />
        </div>
      </nav>
      <div className='p-6'>{children}</div>
    </>
  )
}
