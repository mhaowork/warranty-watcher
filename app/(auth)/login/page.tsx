'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { getCurrentUserClient } from '@/lib/supabase/client-auth';
import { isSaaSMode } from '@/lib/config';

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
    if (error) {
      setOauthError(decodeURIComponent(error));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Redirect to main page if not in SaaS mode
    if (!isSaaSMode()) {
      console.log('Not in SaaS mode, redirecting to main page');
      router.push('/');
      return;
    }

    console.log('Checking auth');
    // Check if user is already authenticated
    async function checkAuth() {
      try {
        const { user } = await getCurrentUserClient();
        if (user) {
          router.push('/'); // User is already logged in, redirect to main page
          return;
        }
        console.log('User not authenticated');
      } catch (error) {
        // Error checking auth, continue to show login form
        console.error('Error checking authentication:', error);
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