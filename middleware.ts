import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to handle authentication for SaaS mode
 * Protects routes that require authentication and manages user sessions
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get deployment mode from environment
  const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || process.env.DEPLOYMENT_MODE || 'self-hosted';
  const isSaaSMode = deploymentMode === 'saas';

  // If not in SaaS mode, allow all requests to proceed
  if (!isSaaSMode) {
    return NextResponse.next();
  }

  // Supabase configuration check
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing for SaaS mode');
    return NextResponse.error();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Create Supabase client for middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    const { data: { user } } = await supabase.auth.getUser();

    // Define protected routes (routes that require authentication)
    const protectedPaths = ['/reports', '/api', '/logs'];
    const authPaths = ['/login', '/auth/callback'];
    const publicPaths = ['/favicon.ico', '/public', '/api/webhooks/stripe'];

    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
    const isAuthPath = authPaths.some(path => pathname.startsWith(path));
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isHomePage = pathname === '/';

    // Check if user needs authentication for protected paths or home page
    if ((isProtectedPath || isHomePage) && !isAuthPath && !isPublicPath && !user) {
      // User is not authenticated, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthPath && user) {
      // User is already authenticated, redirect to main page
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

  } catch (error) {
    console.error('Error in auth middleware:', error);
    // Continue to next middleware/page on error
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 