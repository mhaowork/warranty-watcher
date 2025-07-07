'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { appConfig, isSaaSMode } from '@/lib/config';

/**
 * Client-side Supabase client for authentication in browser
 * Only available in SaaS mode
 */
export function createClientSupabaseClient() {
  if (!isSaaSMode()) {
    throw new Error('Supabase client is only available in SaaS mode');
  }

  if (!appConfig.supabase?.url || !appConfig.supabase?.anonKey) {
    throw new Error('Supabase configuration is required for SaaS mode');
  }

  return createBrowserClient(
    appConfig.supabase.url,
    appConfig.supabase.anonKey
  );
}

export async function signInWithMicrosoft() {
  const supabase = createClientSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid email profile',
    },
  });

  return { data, error };
}

export async function signOut() {
  const supabase = createClientSupabaseClient();
  
  const { error } = await supabase.auth.signOut();
  
  return { error };
}

export async function getCurrentUserClient() {
  const supabase = createClientSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return { user, error };
}

/**
 * Auth state change listener for client components
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const supabase = createClientSupabaseClient();
  
  return supabase.auth.onAuthStateChange(callback);
} 