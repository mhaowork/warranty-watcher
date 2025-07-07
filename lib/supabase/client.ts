import { createClient } from '@supabase/supabase-js';
import { appConfig, isSaaSMode } from '@/lib/config';

/**
 * Supabase Client Configuration
 * Only available in SaaS mode
 */

// Client-side Supabase client for authentication
export const supabase = (() => {
  if (!isSaaSMode()) {
    // Return a mock client for self-hosted mode to prevent errors
    return null;
  }

  if (!appConfig.supabase?.url || !appConfig.supabase?.anonKey) {
    throw new Error('Supabase configuration is required for SaaS mode');
  }

  return createClient(appConfig.supabase.url, appConfig.supabase.anonKey);
})();

// Server-side Supabase client with service role (for admin operations)
export const supabaseAdmin = (() => {
  if (!isSaaSMode()) {
    return null;
  }

  if (!appConfig.supabase?.url || !appConfig.supabase?.serviceRoleKey) {
    // Service role key is optional for basic operations
    return null;
  }

  return createClient(appConfig.supabase.url, appConfig.supabase.serviceRoleKey);
})();

// Helper function to get current user (client-side)
export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper function to get user session (client-side)
export async function getUserSession() {
  if (!supabase) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Type exports for Supabase types
export type { User, Session } from '@supabase/supabase-js'; 