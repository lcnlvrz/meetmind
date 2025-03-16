import { Logo } from '@/components/logo'

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className='w-full flex p-4'>
        <div className='[&>svg]:h-14 [&>svg]:fill-white pl-1'>
          <Logo />
        </div>
      </nav>
      <div className='p-6'>{children}</div>
    </>
  )
}
