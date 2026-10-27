import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Enterprise Canonical Hostname Enforcement Middleware
 * 
 * Guarantees that any request arriving at the naked/apex domain (wct-health.com)
 * is immediately redirected with a 308 Permanent Redirect to the canonical
 * www domain (https://www.wct-health.com) preserving path, query params, and HTTP method.
 * 
 * This prevents origin isolation bugs, split localStorage/sessionStorage,
 * and Microsoft Entra ID reply URL mismatches.
 */
export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  // Normalize host (strip port if present)
  const cleanHost = host.split(':')[0].toLowerCase();

  if (cleanHost === 'wct-health.com') {
    const url = request.nextUrl.clone();
    url.host = 'www.wct-health.com';
    url.protocol = 'https:';
    url.port = '';
    // HTTP 308 Permanent Redirect preserves the request method and body
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
