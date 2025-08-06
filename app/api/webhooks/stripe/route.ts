/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isSaaSMode } from '@/lib/config';
import { getStripeCustomer, validateWebhookSignature } from '@/lib/stripe/server';
import { updateSubscription, deleteSubscription, createPaidSubscription } from '@/lib/subscription/service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Only handle webhooks in SaaS mode
  if (!isSaaSMode()) {
    return NextResponse.json({ error: 'Webhooks not available in self-hosted mode' }, { status: 404 });
  }

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature found' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Validate webhook signature
    const event = await validateWebhookSignature(body, signature, webhookSecret);

    logger.info('Received Stripe webhook:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(event: any) {
  const subscription = event.data.object;

  try {
    const customer = await getStripeCustomer(subscription.customer);
    const userId = customer.metadata?.userId;
    
    if (!userId) {
      logger.error('No userId found in customer metadata for subscription:', subscription.id);
      return;
    }

    const subscriptionItem = subscription.items.data[0];
    const currentPeriodStart = new Date(subscriptionItem.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);

    await createPaidSubscription(
      userId,
      customer.email!,
      customer.id,
      'pro',
      subscription.id,
      subscriptionItem.price?.id,
      currentPeriodStart,
      currentPeriodEnd
    );

    logger.info('Subscription record created successfully:', subscription.id);
  } catch (error) {
    logger.error('Error handling subscription creation:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data.object;
  logger.info('Subscription update webhook received:', subscription.id);

  try {
    const customerId = subscription.customer;
    const subscriptionItem = subscription.items.data[0];
    const currentPeriodStart = new Date(subscriptionItem.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;
    
    await updateSubscription(customerId, {
      plan: 'pro',
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt,
    });

    logger.info('Subscription updated in database');
  } catch (error) {
    logger.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  logger.info('Subscription deletion webhook received:', subscription.id);

  try {
    await deleteSubscription(subscription.id);
    logger.info('Subscription record deleted - user back to free plan');
  } catch (error) {
    logger.error('Error handling subscription deletion:', error);
  }
}

async function handleInvoicePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  logger.info('Invoice payment succeeded webhook received:', invoice.id);

  try {
    // Update subscription status to active if it was past_due or incomplete
    if (invoice.subscription) {
      const customerId = invoice.customer;
      await updateSubscription(customerId, {
        status: 'active',
      });
      logger.info('Subscription reactivated after successful payment');
    }
  } catch (error) {
    logger.error('Error handling successful payment:', error);
  }
}

async function handleInvoicePaymentFailed(event: any) {
  const invoice = event.data.object;
  logger.info('Invoice payment failed webhook received:', invoice.id);

  try {
    // Update subscription status to past_due
    if (invoice.subscription) {
      const customerId = invoice.customer;
      await updateSubscription(customerId, {
        status: 'past_due',
      });
      logger.info('Subscription marked as past_due after failed payment');
      
      // TODO: Send notification email to user about failed payment
    }
  } catch (error) {
    logger.error('Error handling failed payment:', error);
  }
}
