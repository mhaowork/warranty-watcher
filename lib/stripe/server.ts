'use server';

import Stripe from 'stripe';
import { BillingInfo } from '@/types/subscription';
import { isSaaSMode } from '@/lib/config';

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required for subscription functionality');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
    typescript: true,
  });
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(
  email: string,
  userId: string,
  billingInfo?: Partial<BillingInfo>
): Promise<Stripe.Customer> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: {
      userId,
    },
    name: billingInfo?.name,
    address: billingInfo?.address,
  });

  return customer;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  stripeCustomerId: string,
  stripePriceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  const session = await getStripe().checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: false,
    billing_address_collection: 'auto',
    automatic_tax: {
      enabled: false,
    },
  });

  return session;
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get Stripe subscription by ID
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  return await getStripe().subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  if (cancelAtPeriodEnd) {
    return await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await getStripe().subscriptions.cancel(subscriptionId);
  }
}

/**
 * Reactivate a subscription
 */
export async function reactivateStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  return await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update subscription to new price
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  
  return await getStripe().subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

/**
 * Get upcoming invoice for a customer
 */
export async function getUpcomingInvoice(
  stripeCustomerId: string
): Promise<Stripe.Invoice | null> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  try {
    // TODO: Fix the Stripe API method when configuring Stripe
    // return await stripe.invoices.upcoming({
    //   customer: stripeCustomerId,
    // });
    console.log('Getting upcoming invoice for customer:', stripeCustomerId);
    return null;
  } catch {
    // No upcoming invoice
    return null;
  }
}

/**
 * Get payment methods for a customer
 */
export async function getCustomerPaymentMethods(
  stripeCustomerId: string
): Promise<Stripe.PaymentMethod[]> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  const paymentMethods = await getStripe().paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Validate webhook signature
 */
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

/**
 * Get customer by ID
 */
export async function getStripeCustomer(
  customerId: string
): Promise<Stripe.Customer> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  return await getStripe().customers.retrieve(customerId) as Stripe.Customer;
}

/**
 * Update customer information
 */
export async function updateStripeCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  if (!isSaaSMode()) {
    throw new Error('Stripe operations are only available in SaaS mode');
  }

  return await getStripe().customers.update(customerId, updates);
} 