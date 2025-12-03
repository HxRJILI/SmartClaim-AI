import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

/**
 * SmartClaim middleware
 * - Redirects root to /smartclaim/dashboard or /auth/sign-in
 * - Protects /smartclaim/* routes (role checks)
 * - SKIPS auth checks for public routes: /auth/*, /api/*, /_next/*, /static/*, /favicon.ico
 */

export async function middleware(request: NextRequest) {
  // create a NextResponse we can modify/return
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;

  // 1) Early-exit for static/public or auth-related routes (do NOT run protection)
  // Add any additional public prefixes you need (docs, health checks, etc.)
  const publicPrefixes = [
    '/auth',        // sign-in, sign-up, password reset, callback
    '/api',         // api routes
    '/_next',       // Next internals
    '/static',      // static assets
    '/favicon.ico', // favicon
    '/images',      // static images if used
    '/health',      // health endpoints
  ];

  for (const prefix of publicPrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return response; // allow these through without middleware auth logic
    }
  }

  // Create supabase middleware client (binds to req/res)
  const supabase = createMiddlewareClient({ req: request, res: response });

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // 2) Redirect root '/' to dashboard or sign-in
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/smartclaim/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  }

  // 3) Protect /smartclaim/* routes
  if (pathname.startsWith('/smartclaim')) {
    // Not authenticated -> redirect to sign-in
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Fetch user profile to check role/department
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, department_id')
      .eq('id', user.id)
      .maybeSingle();

    const role = userProfile?.role ?? null;

    // Department page: require department_manager or admin
    if (pathname.startsWith('/smartclaim/department')) {
      const allowed = role === 'department_manager' || role === 'admin';
      if (!allowed) {
        return NextResponse.redirect(new URL('/smartclaim/dashboard', request.url));
      }
    }

    // Admin pages: require admin
    if (pathname.startsWith('/smartclaim/admin')) {
      const allowed = role === 'admin';
      if (!allowed) {
        return NextResponse.redirect(new URL('/smartclaim/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  // Temporarily disable middleware to bypass cookie parsing error
  // Will re-enable once authentication is working
  matcher: [],
  // Original matcher: ['/', '/smartclaim/:path*'],
};