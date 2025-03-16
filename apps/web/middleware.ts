import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  console.log('middleware gets executed')

  if (!sessionCookie)
    return NextResponse.redirect(new URL('/auth/login', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard'],
}
