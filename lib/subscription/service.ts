'use server';

import { UserSubscription, SubscriptionPlan, UsageMetrics } from '@/types/subscription';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSaaSMode } from '@/lib/config';
import { getPlan, getPlanLimits, isWithinPlanLimits } from './plans';
import { createCheckoutSession, createBillingPortalSession } from '@/lib/stripe/server';

/**
 * Get the current user's subscription
 * TODO: Implement proper database integration once subscription tables are set up
 */
export async function getCurrentUserSubscription(): Promise<UserSubscription | null> {
  if (!isSaaSMode()) {
    return null; // No subscriptions in self-hosted mode
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // TODO: Implement database query for user subscriptions
  // For now, return a default free subscription
  return {
    id: 'temp-' + user.id,
    userId: user.id,
    plan: 'free',
    status: 'active',
    stripeCustomerId: 'temp-customer-' + user.id,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a free subscription for a new user
 * TODO: Implement proper database integration
 */
export async function createFreeSubscription(userId: string): Promise<UserSubscription> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  // TODO: Create Stripe customer and save to database
  // For now, return a mock subscription
  return {
    id: 'temp-' + userId,
    userId: userId,
    plan: 'free',
    status: 'active',
    stripeCustomerId: 'temp-customer-' + userId,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get current usage metrics for the user
 * TODO: Implement proper database integration
 */
export async function getCurrentUsageMetrics(): Promise<UsageMetrics> {
  if (!isSaaSMode()) {
    // Return dummy metrics for self-hosted mode
    return {
      deviceCount: 0,
      clientCount: 0,
      apiCallsThisMonth: 0,
      lastUpdated: new Date(),
    };
  }

  // TODO: Implement actual usage tracking
  // For now, return mock data
  return {
    deviceCount: 5,
    clientCount: 2,
    apiCallsThisMonth: 100,
    lastUpdated: new Date(),
  };
}

/**
 * Update usage metrics (called when devices are added/removed)
 * TODO: Implement proper database integration
 */
export async function updateUsageMetrics(): Promise<void> {
  if (!isSaaSMode()) {
    return; // No usage tracking in self-hosted mode
  }

  // TODO: Implement actual usage tracking
  console.log('Usage metrics updated');
}

/**
 * Check if user can perform an action based on plan limits
 */
export async function checkPlanLimits(action: 'add_device' | 'add_client'): Promise<{ allowed: boolean; reason?: string }> {
  if (!isSaaSMode()) {
    return { allowed: true }; // No limits in self-hosted mode
  }

  const subscription = await getCurrentUserSubscription();
  if (!subscription) {
    return { allowed: false, reason: 'No subscription found' };
  }

  const usage = await getCurrentUsageMetrics();
  const limits = getPlanLimits(subscription.plan);

  switch (action) {
    case 'add_device':
      if (usage.deviceCount >= limits.maxDevices) {
        return { 
          allowed: false, 
          reason: `Device limit reached (${limits.maxDevices}). Upgrade your plan to add more devices.` 
        };
      }
      break;
    case 'add_client':
      if (usage.clientCount >= limits.maxClients) {
        return { 
          allowed: false, 
          reason: `Client limit reached (${limits.maxClients}). Upgrade your plan to add more clients.` 
        };
      }
      break;
  }

  return { allowed: true };
}

/**
 * Create Stripe checkout session for subscription upgrade
 */
export async function createSubscriptionCheckout(
  plan: SubscriptionPlan,
  isYearly: boolean = false
): Promise<string> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  const subscription = await getCurrentUserSubscription();
  if (!subscription) {
    throw new Error('No subscription found');
  }

  const planConfig = getPlan(plan);
  const priceId = isYearly ? planConfig.stripeYearlyPriceId : planConfig.stripePriceId;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await createCheckoutSession(
    subscription.stripeCustomerId,
    priceId,
    `${baseUrl}/billing/success`,
    `${baseUrl}/billing/cancel`
  );

  return session.url!;
}

/**
 * Create billing portal session for subscription management
 */
export async function createBillingPortal(): Promise<string> {
  if (!isSaaSMode()) {
    throw new Error('Billing portal is only available in SaaS mode');
  }

  const subscription = await getCurrentUserSubscription();
  if (!subscription) {
    throw new Error('No subscription found');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await createBillingPortalSession(
    subscription.stripeCustomerId,
    `${baseUrl}/billing`
  );

  return session.url;
}

/**
 * Get subscription overview for dashboard
 */
export async function getSubscriptionOverview() {
  if (!isSaaSMode()) {
    return null;
  }

  const subscription = await getCurrentUserSubscription();
  const usage = await getCurrentUsageMetrics();

  if (!subscription) {
    return null;
  }

  const planConfig = getPlan(subscription.plan);
  const limits = getPlanLimits(subscription.plan);
  const limitCheck = isWithinPlanLimits(subscription.plan, {
    deviceCount: usage.deviceCount,
    clientCount: usage.clientCount,
  });

  return {
    subscription,
    usage,
    planConfig,
    limits,
    withinLimits: limitCheck.withinLimits,
    violations: limitCheck.violations,
  };
} 