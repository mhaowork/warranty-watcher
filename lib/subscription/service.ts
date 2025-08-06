'use server';

import { UserSubscription, SubscriptionPlan } from '@/types/subscription';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSaaSMode } from '@/lib/config';
import { SUBSCRIPTION_PLANS } from './plans';
import { createCheckoutSession, createBillingPortalSession } from '@/lib/stripe/server';
import { getAllDevices } from '@/lib/database/service';

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
 */
export async function getDeviceCount(): Promise<number> {
    const devices = await getAllDevices();
    return devices.length;
}

/**
 * Check if user can perform an action based on plan limits
 * Only enforces limits for free plan
 */
export async function checkPlanLimits(): Promise<boolean> {
  if (!isSaaSMode()) {
    return true; // No limits in self-hosted mode
  }

  const subscription = await getCurrentUserSubscription();
  if (!subscription) {
    return false;
  }

  // Only enforce limits for free plan
  if (subscription.plan !== 'free') {
    return true; // Pro and Enterprise are unlimited
  }

  const deviceCount = await getDeviceCount();

  return deviceCount <= SUBSCRIPTION_PLANS.free.features.maxDevices;
}

/**
 * Create Stripe checkout session for subscription upgrade
 */
export async function createSubscriptionCheckout(
  plan: SubscriptionPlan
): Promise<string> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  const subscription = await getCurrentUserSubscription();
  if (!subscription) {
    throw new Error('No subscription found');
  }

  const planConfig = SUBSCRIPTION_PLANS[plan];
  const priceId = planConfig.stripePriceId;

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

  if (!subscription) {
    return null;
  }

  const planConfig = SUBSCRIPTION_PLANS[subscription.plan];

  return {
    subscription,
    planConfig,
  };
} 