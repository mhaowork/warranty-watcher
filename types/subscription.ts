/**
 * Subscription Plans
 */
export type SubscriptionPlan = 'free' | 'pro';

export interface PlanFeatures {
  maxDevices: number;
  warrantyTracking: boolean;
  apiAccess: boolean;
  supportLevel: 'community' | 'email' | 'priority';
  exportFeatures: boolean;
  advancedReports: boolean;
}

export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number; // Monthly price in cents
  stripePriceId: string; // Stripe Price ID
  features: PlanFeatures;
}

/**
 * Subscription Status
 */
export type SubscriptionStatus = 
  | 'incomplete'
  | 'incomplete_expired'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

/**
 * User Subscription
 */
export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Billing Information
 */
export interface BillingInfo {
  email: string;
  name?: string;
  company?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

/**
 * Usage Tracking
 */
export interface UsageMetrics {
  deviceCount: number;
  clientCount: number;
  apiCallsThisMonth: number;
  lastUpdated: Date;
}

/**
 * Subscription Events (for webhooks)
 */
export type SubscriptionEventType = 
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export interface SubscriptionEvent {
  id: string;
  type: SubscriptionEventType;
  data: Record<string, unknown>;
  processed: boolean;
  createdAt: Date;
} 