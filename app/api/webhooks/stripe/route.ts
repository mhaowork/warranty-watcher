/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isSaaSMode } from '@/lib/config';
import { validateWebhookSignature } from '@/lib/stripe/server';

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
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Validate webhook signature
    const event = await validateWebhookSignature(body, signature, webhookSecret);

    console.log('Received Stripe webhook:', event.type);

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
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(event: any) {
  console.log('Subscription created:', event.data?.object?.id);
  // TODO: Update user subscription in database
  // const subscription = event.data.object;
  // await updateUserSubscription(subscription);
}

async function handleSubscriptionUpdated(event: any) {
  console.log('Subscription updated:', event.data?.object?.id);
  // TODO: Update user subscription in database
  // const subscription = event.data.object;
  // await updateUserSubscription(subscription);
}

async function handleSubscriptionDeleted(event: any) {
  console.log('Subscription deleted:', event.data?.object?.id);
  // TODO: Handle subscription cancellation
  // const subscription = event.data.object;
  // await handleSubscriptionCancellation(subscription);
}

async function handleInvoicePaymentSucceeded(event: any) {
  console.log('Invoice payment succeeded:', event.data?.object?.id);
  // TODO: Update subscription status, extend billing period
  // const invoice = event.data.object;
  // await handleSuccessfulPayment(invoice);
}

async function handleInvoicePaymentFailed(event: any) {
  console.log('Invoice payment failed:', event.data?.object?.id);
  // TODO: Handle failed payment, notify user
  // const invoice = event.data.object;
  // await handleFailedPayment(invoice);
}

async function handleTrialWillEnd(event: any) {
  console.log('Trial will end:', event.data?.object?.id);
  // TODO: Notify user about trial ending
  // const subscription = event.data.object;
  // await notifyTrialEnding(subscription);
} 