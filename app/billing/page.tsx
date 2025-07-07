import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSaaSMode } from '@/lib/config';
import { getSubscriptionOverview, createBillingPortal } from '@/lib/subscription/service';
import PricingPlans from '@/components/PricingPlans';
import { CreditCard, Settings } from 'lucide-react';

export default async function BillingPage() {
  // Redirect if not in SaaS mode
  if (!isSaaSMode()) {
    redirect('/');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const overview = await getSubscriptionOverview();
  
  if (!overview) {
    // User doesn't have a subscription yet, redirect to pricing
    redirect('/billing?tab=pricing');
  }

  async function handleManageSubscription() {
    'use server';
    try {
      const portalUrl = await createBillingPortal();
      redirect(portalUrl);
    } catch (error) {
      console.error('Error creating billing portal:', error);
      // TODO: Show error message
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and upgrade your plan
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">
              Upgrade or manage your subscription at any time
            </p>
          </div>
          <PricingPlans 
            currentPlan={overview.subscription.plan}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6">
            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>
                  Manage your billing details and payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment Method</p>
                      <p className="text-sm text-muted-foreground">
                        {overview.subscription.plan === 'free' 
                          ? 'No payment method required' 
                          : 'Managed through Stripe'}
                      </p>
                    </div>
                    {overview.subscription.plan !== 'free' && (
                      <Badge variant="outline">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Billing Email</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>
                  Current subscription information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {overview.planConfig.name}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <Badge className="capitalize">
                        {overview.subscription.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Current Period</p>
                      <p className="text-sm text-muted-foreground">
                        {overview.subscription.currentPeriodEnd.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Auto-renewal</p>
                      <p className="text-sm text-muted-foreground">
                        {overview.subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            {overview.subscription.plan !== 'free' && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Subscription</CardTitle>
                  <CardDescription>
                    Update payment methods, download invoices, or cancel your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Use Stripe&apos;s secure billing portal to manage your subscription, update payment methods, 
                      download invoices, or cancel your subscription.
                    </p>
                    <form action={handleManageSubscription}>
                      <Button type="submit" variant="outline">
                        Manage Subscription
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 