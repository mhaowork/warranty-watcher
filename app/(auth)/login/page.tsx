'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { getCurrentUserClient } from '@/lib/supabase/client-auth';
import { isSaaSMode } from '@/lib/config';
import { logger } from '@/lib/logger';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const router = useRouter();

  // Handle client-side mounting
  // TODO: Clean up useEffect <> State
  useEffect(() => {
    setMounted(true);
    
    // Check for OAuth error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDetails = urlParams.get('error_details');
    
    if (error) {
      setOauthError(error); // Pass the error type to LoginForm for user-friendly message
      
      // Log the detailed error for debugging
      if (errorDetails) {
        logger.error('OAuth login failed with details', 'auth', {
          errorType: error,
          errorDetails: decodeURIComponent(errorDetails)
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Redirect to main page if not in SaaS mode
    if (!isSaaSMode()) {
      router.push('/');
      return;
    }

    // Check if user is already authenticated
    async function checkAuth() {
      try {
        const { user } = await getCurrentUserClient();
        if (user) {
          router.push('/'); // User is already logged in, redirect to main page
          return;
        }
        logger.info('User not authenticated');
      } catch (error) {
        // Error checking auth, continue to show login form
        logger.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router, mounted]);

  // Show loading screen until mounted and SaaS mode is confirmed
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not in SaaS mode, show loading (will redirect)
  if (!isSaaSMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <LoginForm oauthError={oauthError} />
      </div>
    </div>
  );
} 