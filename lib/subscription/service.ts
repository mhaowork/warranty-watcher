'use server';

import { UserSubscription, SubscriptionPlan, SubscriptionStatus } from '@/types/subscription';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSaaSMode } from '@/lib/config';
import { SUBSCRIPTION_PLANS } from './plans';
import { createCheckoutSession, createBillingPortalSession, createStripeCustomer } from '@/lib/stripe/server';
import { getAllDevices } from '@/lib/database/service';
import { getDatabaseAdapter } from '@/lib/database/factory';

/**
 * Get the current user's subscription from database
 * Returns null if user has no subscription (= free plan)
 */
export async function getCurrentUserSubscription(): Promise<UserSubscription | null> {
  if (!isSaaSMode()) {
    return null; // No subscriptions in self-hosted mode
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const db = getDatabaseAdapter();
  
  try {
    // Try to get existing subscription from database
    const result = await db.executeQuery(`
      SELECT 
        id, user_id, plan, status, stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end, cancel_at_period_end,
        canceled_at, created_at, updated_at
      FROM subscriptions 
      WHERE user_id = $1
    `, [user.id]);

    if (result.rows.length > 0) {
      const row = result.rows[0] as Record<string, unknown>;
      return {
        id: row.id as string,
        userId: row.user_id as string,
        plan: row.plan as SubscriptionPlan,
        status: row.status as SubscriptionStatus,
        stripeCustomerId: row.stripe_customer_id as string,
        stripeSubscriptionId: row.stripe_subscription_id as string | undefined,
        currentPeriodStart: row.current_period_start ? new Date(row.current_period_start as string) : new Date(),
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end as string) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: row.cancel_at_period_end as boolean || false,
        canceledAt: row.canceled_at ? new Date(row.canceled_at as string) : undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      };
    }

    // No subscription found = free plan (no record needed)
    return null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}

/**
 * Get the user's current plan (free or paid)
 * Returns 'free' if no subscription record exists
 */
export async function getCurrentUserPlan(): Promise<SubscriptionPlan> {
  const subscription = await getCurrentUserSubscription();
  return subscription?.plan || 'free';
}

/**
 * Create a paid subscription for a user (called when they upgrade)
 */
export async function createPaidSubscription(
  userId: string, 
  email: string, 
  plan: SubscriptionPlan,
  stripeSubscriptionId: string,
  stripePriceId?: string,
  currentPeriodStart?: Date,
  currentPeriodEnd?: Date
): Promise<UserSubscription> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  const db = getDatabaseAdapter();

  try {
    // Create a real Stripe customer (or get existing one)
    let stripeCustomer;
    
    // Check if we already have a customer for this user
    const existingResult = await db.executeQuery(`
      SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1
    `, [userId]);
    
    if (existingResult.rows.length > 0) {
      const existingRow = existingResult.rows[0] as Record<string, unknown>;
      stripeCustomer = { id: existingRow.stripe_customer_id as string };
    } else {
      stripeCustomer = await createStripeCustomer(email, userId);
    }

    // Insert or update subscription in database
    const result = await db.executeQuery(`
      INSERT INTO subscriptions (
        user_id, plan, status, stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end, cancel_at_period_end
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
      RETURNING 
        id, user_id, plan, status, stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end, cancel_at_period_end,
        canceled_at, created_at, updated_at
    `, [
      userId,
      plan,
      'active',
      stripeCustomer.id,
      stripeSubscriptionId,
      currentPeriodStart || new Date(),
      currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      false
    ]);

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      plan: row.plan as SubscriptionPlan,
      status: row.status as SubscriptionStatus,
      stripeCustomerId: row.stripe_customer_id as string,
      stripeSubscriptionId: row.stripe_subscription_id as string | undefined,
      currentPeriodStart: new Date(row.current_period_start as string),
      currentPeriodEnd: new Date(row.current_period_end as string),
      cancelAtPeriodEnd: row.cancel_at_period_end as boolean,
      canceledAt: row.canceled_at ? new Date(row.canceled_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  } catch (error) {
    console.error('Error creating paid subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Delete subscription (downgrade to free plan)
 */
export async function deleteSubscription(userId: string): Promise<void> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  const db = getDatabaseAdapter();
  
  try {
    await db.executeQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw new Error('Failed to delete subscription');
  }
}

/**
 * Update subscription in database (called from webhook)
 */
export async function updateSubscription(
  stripeCustomerId: string,
  updates: Partial<{
    plan: SubscriptionPlan;
    status: string;
    stripeSubscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date;
  }>
): Promise<void> {
  if (!isSaaSMode()) {
    throw new Error('Subscriptions are only available in SaaS mode');
  }

  const db = getDatabaseAdapter();
  
  const setParts: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setParts.push(`${dbKey} = $${paramCount + 1}`);
      values.push(value);
      paramCount++;
    }
  });

  if (setParts.length === 0) return;

  setParts.push(`updated_at = NOW()`);
  values.unshift(stripeCustomerId);

  const query = `
    UPDATE subscriptions 
    SET ${setParts.join(', ')}
    WHERE stripe_customer_id = $1
  `;

  await db.executeQuery(query, values);
}

/**
 * Get current usage metrics for the user
 */
export async function getDeviceCount(): Promise<number> {
  const devices = await getAllDevices();
  return devices.length;
}

/**
 * Check if current usage is within plan limits
 */
export async function checkPlanLimits(): Promise<boolean> {
  const plan = await getCurrentUserPlan();
  const deviceCount = await getDeviceCount();

  return deviceCount <= SUBSCRIPTION_PLANS[plan].features.maxDevices;
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

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // For free users, we need to create a Stripe customer for the checkout
  const subscription = await getCurrentUserSubscription();
  let stripeCustomerId: string;

  if (subscription?.stripeCustomerId) {
    stripeCustomerId = subscription.stripeCustomerId;
  } else {
    // Free user upgrading - create Stripe customer
    const stripeCustomer = await createStripeCustomer(user.email || '', user.id);
    stripeCustomerId = stripeCustomer.id;
  }

  const planConfig = SUBSCRIPTION_PLANS[plan];
  const priceId = planConfig.stripePriceId;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await createCheckoutSession(
    stripeCustomerId,
    priceId,
    `${baseUrl}/billing?success=true`,
    `${baseUrl}/billing?canceled=true`
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
  if (!subscription?.stripeCustomerId) {
    throw new Error('No active subscription found');
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
  const plan = subscription?.plan || 'free';
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const deviceCount = await getDeviceCount();

  return {
    subscription,
    plan,
    planConfig,
    usage: {
      devices: deviceCount,
      maxDevices: planConfig.features.maxDevices,
    },
  };
} 

/**
 * Get subscription status including cancellation info
 */
export async function getSubscriptionStatus() {
  if (!isSaaSMode()) {
    return null;
  }

  const subscription = await getCurrentUserSubscription();
  const plan = subscription?.plan || 'free';
  
  return {
    plan,
    isActive: subscription?.status === 'active',
    isPaid: plan !== 'free',
    isScheduledForCancellation: subscription?.cancelAtPeriodEnd || false,
    currentPeriodEnd: subscription?.currentPeriodEnd,
  };
} 