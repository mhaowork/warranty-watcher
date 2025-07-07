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
      maxDevices: 50,
      maxClients: 5,
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
    yearlyPrice: 75000, // $750/year ($62.50/month) - 15% discount
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
    features: {
      maxDevices: 5000,
      maxClients: 100,
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
    yearlyPrice: 200000, // $2000/year ($166.67/month) - 20% discount
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    stripeYearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '',
    features: {
      maxDevices: 100000,
      maxClients: 1000,
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
 * Check if a plan supports a specific feature
 */
export function planSupportsFeature(
  planId: SubscriptionPlan,
  feature: keyof SubscriptionPlanConfig['features']
): boolean {
  return SUBSCRIPTION_PLANS[planId].features[feature] as boolean;
}

/**
 * Get usage limits for a plan
 */
export function getPlanLimits(planId: SubscriptionPlan) {
  const plan = SUBSCRIPTION_PLANS[planId];
  return {
    maxDevices: plan.features.maxDevices,
    maxClients: plan.features.maxClients,
  };
}

/**
 * Check if usage is within plan limits
 */
export function isWithinPlanLimits(
  planId: SubscriptionPlan,
  usage: { deviceCount: number; clientCount: number }
): { withinLimits: boolean; violations: string[] } {
  const limits = getPlanLimits(planId);
  const violations: string[] = [];

  if (usage.deviceCount > limits.maxDevices) {
    violations.push(`Device count (${usage.deviceCount}) exceeds plan limit (${limits.maxDevices})`);
  }

  if (usage.clientCount > limits.maxClients) {
    violations.push(`Client count (${usage.clientCount}) exceeds plan limit (${limits.maxClients})`);
  }

  return {
    withinLimits: violations.length === 0,
    violations,
  };
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(0)}`;
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(plan: SubscriptionPlanConfig): number {
  if (!plan.yearlyPrice) return 0;
  const monthlyTotal = plan.price * 12;
  return monthlyTotal - plan.yearlyPrice;
}

/**
 * Format yearly savings as percentage
 */
export function formatYearlySavingsPercentage(plan: SubscriptionPlanConfig): string {
  if (!plan.yearlyPrice) return '0%';
  const monthlyTotal = plan.price * 12;
  const savings = monthlyTotal - plan.yearlyPrice;
  const percentage = Math.round((savings / monthlyTotal) * 100);
  return `${percentage}%`;
} 