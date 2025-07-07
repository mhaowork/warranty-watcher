import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { appConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // If no code, redirect to login with error
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

    // Exchange code for session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error);
      const errorMessage = encodeURIComponent(error.message || 'oauth_error');
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
    }

    if (!session) {
      console.error('No session created after OAuth callback');
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    // Successful authentication, redirect to main page
    return response;
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
  }
} 