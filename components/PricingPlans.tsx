'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Star } from 'lucide-react';
import { getAllPlans, formatPrice } from '@/lib/subscription/plans';
import { createSubscriptionCheckout } from '@/lib/subscription/service';
import { SubscriptionPlan } from '@/types/subscription';

interface PricingPlansProps {
  currentPlan?: SubscriptionPlan;
  showCurrentPlan?: boolean;
}

const planIcons = {
  free: Star,
  pro: Crown,
};

const planGradients = {
  free: 'from-gray-50 to-gray-100',
  pro: 'from-blue-50 to-blue-100',
};

export default function PricingPlans({ 
  currentPlan, 
  showCurrentPlan = true 
}: PricingPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const plans = getAllPlans();

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setLoading(plan);
    try {
      const checkoutUrl = await createSubscriptionCheckout(plan);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId: SubscriptionPlan) => {
    return showCurrentPlan && currentPlan === planId;
  };

  return (
    <div className="space-y-8">
      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const PlanIcon = planIcons[plan.id as keyof typeof planIcons];
          const gradient = planGradients[plan.id as keyof typeof planGradients];
          const isCurrent = isCurrentPlan(plan.id);
          const isFree = plan.id === 'free';

          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col h-full ${
                isCurrent ? 'border-primary' : ''
              }`}
            >
              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 rounded-br-lg">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  <span className="text-xs font-medium">Current</span>
                </div>
              )}

              {/* Plan Header */}
              <CardHeader className={`bg-gradient-to-r ${gradient} pb-8 pt-8`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mt-2">
                    <PlanIcon className="h-6 w-6" />
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                {/* Pricing */}
                <div className="mt-4">
                  {isFree ? (
                     <div>
                     <div className="flex items-baseline gap-1">
                       <span className="text-3xl font-bold">
                         Free
                       </span>
                     </div>
                   </div>

                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Features */}
              <CardContent className="flex-1 pt-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {plan.features.maxDevices === Number.MAX_SAFE_INTEGER 
                          ? 'Unlimited devices' 
                          : `Up to ${plan.features.maxDevices.toLocaleString()} devices`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Warranty tracking</span>
                    </div>
                    {plan.features.apiAccess && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">API access</span>
                      </div>
                    )}
                    {plan.features.exportFeatures && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Export features</span>
                      </div>
                    )}
                    {plan.features.advancedReports && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Advanced reports</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm capitalize">
                        {plan.features.supportLevel} support
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Action Button */}
              <CardContent className="pt-0">
                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : isFree ? (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full"
                    variant="outline"
                  >
                    {loading === plan.id ? 'Processing...' : 'Downgrade to Free'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full"
                  >
                    {loading === plan.id ? 'Processing...' : 'Upgrade Now'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 