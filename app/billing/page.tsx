import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSaaSMode } from '@/lib/config';
import { 
  getSubscriptionOverview, 
  createBillingPortal, 
  getSubscriptionStatus
} from '@/lib/subscription/service';
import PricingPlans from '@/components/PricingPlans';
import { CreditCard, Settings, AlertTriangle } from 'lucide-react';

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
  const subscriptionStatus = await getSubscriptionStatus();
  
  // If no overview, something went wrong - but we can still show the page
  if (!overview) {
    redirect('/billing?tab=pricing');
  }

  const isFreePlan = overview.plan === 'free';

  async function handleManageSubscription() {
    'use server';
    const portalUrl = await createBillingPortal();
    redirect(portalUrl);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and upgrade your plan
        </p>
      </div>

      {/* Cancellation Notice */}
      {subscriptionStatus?.isScheduledForCancellation && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Subscription Ending</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Your subscription will end on{' '}
                  <strong>{subscriptionStatus.currentPeriodEnd?.toLocaleDateString()}</strong>.
                  You&apos;ll continue to have access to all features until then.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            currentPlan={overview.plan}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6">
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
                        {isFreePlan ? 'Free' : overview.subscription?.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                  
                  {!isFreePlan && overview.subscription && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Current Period End</p>
                        <p className="text-sm text-muted-foreground">
                          {overview.subscription.currentPeriodEnd.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isFreePlan && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        You&apos;re currently on the free plan with access to {overview.planConfig.features.maxDevices} devices. 
                        Upgrade to get unlimited devices and premium features.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Information */}
            <Card>
              <CardHeader>
                <CardTitle>Current Usage</CardTitle>
                <CardDescription>
                  Monitor your plan usage and limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Devices</p>
                      <p className="text-sm text-muted-foreground">
                        {overview.usage.devices} of {overview.usage.maxDevices === Number.MAX_SAFE_INTEGER ? 'unlimited' : overview.usage.maxDevices} devices
                      </p>
                    </div>
                    <Badge variant={overview.usage.devices > overview.usage.maxDevices ? 'destructive' : 'secondary'}>
                      {overview.usage.maxDevices === Number.MAX_SAFE_INTEGER ? 'Unlimited' : `${Math.round((overview.usage.devices / overview.usage.maxDevices) * 100)}%`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            {!isFreePlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Subscription</CardTitle>
                  <CardDescription>
                    Update payment methods, download invoices, and cancel your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <form action={handleManageSubscription}>
                      <Button type="submit" size="lg">
                        Open Billing Portal
                      </Button>
                    </form>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Update payment methods and billing information</p>
                      <p>• Download invoices and billing history</p>
                      <p>• Cancel subscription (access continues until period end)</p>
                      <p>• Manage all subscription settings in Stripe&apos;s secure portal</p>
                    </div>
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