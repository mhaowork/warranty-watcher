import { SubscriptionPlanConfig, SubscriptionPlan } from '@/types/subscription';

/**
 * Subscription Plan Configurations
 * These define the features and pricing for each subscription tier
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out Warranty Watcher',
    price: 0,
    stripePriceId: '', // No Stripe price for free plan
    features: {
      maxDevices: 200,
      warrantyTracking: true,
      apiAccess: false,
      supportLevel: 'community',
      exportFeatures: false,
      advancedReports: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing MSPs managing multiple clients',
    price: 7500, // $75/month in cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: {
      maxDevices: Number.MAX_SAFE_INTEGER, // Unlimited
      warrantyTracking: true,
      apiAccess: true,
      supportLevel: 'email',
      exportFeatures: true,
      advancedReports: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large MSPs with advanced needs',
    price: 20000, // $200/month in cents
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    features: {
      maxDevices: Number.MAX_SAFE_INTEGER, // Unlimited
      warrantyTracking: true,
      apiAccess: true,
      supportLevel: 'priority',
      exportFeatures: true,
      advancedReports: true,
    },
  },
};

/**
 * Get plan configuration by ID
 */
export function getPlan(planId: SubscriptionPlan): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS[planId];
}

/**
 * Get all available plans
 */
export function getAllPlans(): SubscriptionPlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS);
}


/**
 * Format price for display
 */
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(0)}`;
} 