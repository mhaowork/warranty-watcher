'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserClient, signOut } from '@/lib/supabase/client-auth';
import { isSaaSMode } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import type { User } from '@supabase/supabase-js';

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  // TODO: Clean up useEffect <> State
  useEffect(() => {
    if (!isSaaSMode()) {
      setIsLoading(false);
      return;
    }

    async function getUser() {
      try {
        const { user } = await getCurrentUserClient();
        setUser(user);
      } catch (error) {
        logger.error('Error getting user profile', 'user-profile', { error });
      } finally {
        setIsLoading(false);
      }
    }

    getUser();
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    
    try {
      const { error } = await signOut();
      
      if (error) {
        logger.error(`Sign out error: ${error.message}`, 'user-profile');
        alert('Error signing out. Please try again.');
        return;
      }

      logger.info('User signed out successfully', 'user-profile');
      router.refresh(); // Refresh to update auth state
      router.push('/login'); // Redirect to login page
    } catch (error) {
      logger.error('Unexpected sign out error', 'user-profile', { error });
      alert('Error signing out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  // Don't render anything if not in SaaS mode
  if (!isSaaSMode()) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No user state (shouldn't happen with middleware protection)
  if (!user) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <p>Not authenticated</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium text-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Warranty Watcher Dashboard
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 