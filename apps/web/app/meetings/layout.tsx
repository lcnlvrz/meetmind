export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav>
        <p className='font-bold'>meetmind</p>
        <span>supermemory for your meetings</span>
      </nav>
      <div>{children}</div>
    </>
  )
}
