import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { appConfig, isSaaSMode } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * Server-side Supabase client with cookie-based session management
 * Only available in SaaS mode
 */
export async function createServerSupabaseClient() {
  if (!isSaaSMode()) {
    throw new Error('Supabase client is only available in SaaS mode');
  }

  if (!appConfig.supabase?.url || !appConfig.supabase?.anonKey) {
    throw new Error('Supabase configuration is required for SaaS mode');
  }

  const cookieStore = await cookies();

  return createServerClient(
    appConfig.supabase.url,
    appConfig.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            logger.warn('Unable to set cookies in Server Component', 'auth', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user from server-side session
 */
export async function getCurrentUser() {
  if (!isSaaSMode()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.error(`Error getting user: ${error.message}`, 'auth');
      return null;
    }

    return user;
  } catch (error) {
    logger.error(`Error creating Supabase client: ${error}`, 'auth');
    return null;
  }
}

/**
 * Get user session information
 */
export async function getUserSession() {
  if (!isSaaSMode()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.error(`Error getting session: ${error.message}`, 'auth');
      return null;
    }

    return session;
  } catch (error) {
    logger.error(`Error creating Supabase client: ${error}`, 'auth');
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!isSaaSMode()) {
    return true; // Self-hosted mode doesn't require authentication
  }

  const user = await getCurrentUser();
  return !!user;
} 