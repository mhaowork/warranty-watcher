import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { appConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // Handle OAuth error parameters first
  const oauthError = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (oauthError) {
    logger.error('OAuth authentication failed', 'auth', {
      error: oauthError,
      errorCode: errorCode,
      errorDescription: errorDescription,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    });

    // Create more specific error messages for common issues
    let friendlyError = 'oauth_error';
    if (errorDescription?.includes('Error getting user email from external provider')) {
      friendlyError = 'email_permission_error';
    } else if (errorDescription?.includes('does not exist in tenant')) {
      friendlyError = 'tenant_access_error';
    } else if (oauthError === 'access_denied') {
      friendlyError = 'access_denied';
    } else if (oauthError === 'server_error') {
      friendlyError = 'server_error';
    }

    const errorMessage = encodeURIComponent(errorDescription || oauthError);
    return NextResponse.redirect(`${origin}/login?error=${friendlyError}&error_details=${errorMessage}`);
  }

  if (!code) {
    logger.warn('OAuth callback received without code or error parameters', 'auth');
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
  }

  const response = NextResponse.redirect(`${origin}/`);

  try {
    // Create Supabase client
    const supabase = createServerClient(
      appConfig.supabase!.url,
      appConfig.supabase!.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    logger.info('Exchanging OAuth code for session', 'auth');

    // Exchange code for session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('OAuth code exchange failed', 'auth', {
        error: error.message,
        errorCode: error.status,
        userAgent: request.headers.get('user-agent')
      });
      const errorMessage = encodeURIComponent(error.message || 'oauth_error');
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
    }

    if (!session) {
      logger.error('No session created after OAuth callback', 'auth');
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    logger.info('OAuth authentication successful', 'auth', {
      userId: session.user?.id,
      email: session.user?.email,
      provider: session.user?.app_metadata?.provider
    });

    // Successful authentication, redirect to main page
    return response;
  } catch (error) {
    logger.error('Unexpected error in OAuth callback', 'auth', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
  }
} 