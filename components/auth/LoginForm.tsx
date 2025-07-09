'use client';

import { useState } from 'react';
import { signInWithMicrosoft } from '@/lib/supabase/client-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

interface LoginFormProps {
  oauthError?: string | null;
}

export default function LoginForm({ oauthError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use OAuth error if provided, otherwise use local error
  const displayError = oauthError || error;

  // Function to get user-friendly error messages
  function getErrorMessage(errorType: string): string {
    switch (errorType) {
      case 'email_permission_error':
        return 'Unable to access your email address. This often happens with company accounts that have restricted permissions. Contact your IT administrator.';
      case 'tenant_access_error':
        return 'Your account does not have access to this application. Please contact your administrator or try with a different account.';
      case 'access_denied':
        return 'Access was denied. Please try again or contact support if the problem persists.';
      case 'server_error':
        return 'A server error occurred during sign-in. This may be due to account restrictions. Please try again or use a different account.';
      case 'oauth_error':
        return 'An authentication error occurred. Please try again.';
      default:
        return errorType;
    }
  }

  async function handleMicrosoftSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signInWithMicrosoft();
      
      if (error) {
        setError(error.message);
        logger.warn(`Microsoft sign-in failed: ${error.message}`, 'auth');
        setIsLoading(false);
        return;
      }

      logger.info('Microsoft sign-in initiated', 'auth');
      // OAuth will redirect to the provider, so we don't need to handle success here
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      logger.error(`Microsoft sign-in error: ${errorMessage}`, 'auth');
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome to Warranty Watcher</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Sign in with your account to access your warranty dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayError && (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(displayError)}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <Button
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"
                />
              </svg>
              {isLoading ? 'Signing in...' : 'Continue with Microsoft'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 