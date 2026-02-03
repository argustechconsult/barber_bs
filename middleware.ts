import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/session';

export async function middleware(request: NextRequest) {
  // Update session on every request to reset the 2-hour inactivity timer
  await updateSession();
  return NextResponse.next();
}

// Optionally, specify routes that should trigger session refresh
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
