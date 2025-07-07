'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Crown, Mail } from 'lucide-react';
import { getAllPlans, formatPrice, formatYearlySavingsPercentage } from '@/lib/subscription/plans';
import { createSubscriptionCheckout } from '@/lib/subscription/service';
import { SubscriptionPlan } from '@/types/subscription';

interface PricingPlansProps {
  currentPlan?: SubscriptionPlan;
  showCurrentPlan?: boolean;
}

const planIcons = {
  pro: Crown,
  enterprise: Mail,
};

const planGradients = {
  pro: 'from-blue-50 to-blue-100',
  enterprise: 'from-purple-50 to-purple-100',
};

export default function PricingPlans({ 
  currentPlan, 
  showCurrentPlan = true 
}: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const allPlans = getAllPlans();
  // Only show Pro and Enterprise plans (no Free plan)
  const plans = allPlans.filter(plan => plan.id !== 'free');

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setLoading(plan);
    try {
      const checkoutUrl = await createSubscriptionCheckout(plan, isYearly);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // TODO: Show error message to user
    } finally {
      setLoading(null);
    }
  };

  const handleContactUs = () => {
    window.location.href = 'mailto:sales@warrantywatcher.com?subject=Enterprise%20Plan%20Inquiry';
  };

  const getPrice = (plan: ReturnType<typeof getAllPlans>[0]) => {
    if (isYearly && plan.yearlyPrice) {
      return Math.round(plan.yearlyPrice / 12); // Monthly equivalent
    }
    
    return plan.price;
  };

  const getYearlyPrice = (plan: ReturnType<typeof getAllPlans>[0]) => {
    return isYearly ? (plan.yearlyPrice || plan.price * 12) : plan.price * 12;
  };

  const isCurrentPlan = (planId: SubscriptionPlan) => {
    return showCurrentPlan && currentPlan === planId;
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle - Only show for Pro plan */}
      <div className="flex items-center justify-center space-x-4">
        <span className={`text-sm ${!isYearly ? 'font-medium' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-primary"
        />
        <span className={`text-sm ${isYearly ? 'font-medium' : 'text-muted-foreground'}`}>
          Yearly
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-2">
            Save up to 20%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const PlanIcon = planIcons[plan.id as keyof typeof planIcons];
          const monthlyPrice = getPrice(plan);
          const yearlyPrice = getYearlyPrice(plan);
          const savings = formatYearlySavingsPercentage(plan);
          const gradient = planGradients[plan.id as keyof typeof planGradients];
          const isCurrent = isCurrentPlan(plan.id);
          const isEnterprise = plan.id === 'enterprise';

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
              <CardHeader className={`bg-gradient-to-r ${gradient} pb-8`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlanIcon className="h-6 w-6" />
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                {/* Pricing */}
                <div className="mt-4">
                  {isEnterprise ? (
                    <div>
                      <div className="text-2xl font-bold">Contact Us</div>
                      <div className="text-sm text-muted-foreground">
                        Custom pricing for your needs
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          ${formatPrice(monthlyPrice).replace('$', '')}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      
                      {isYearly && plan.yearlyPrice && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          ${formatPrice(yearlyPrice).replace('$', '')} billed annually
                          {savings !== '0%' && (
                            <Badge variant="secondary" className="ml-2">
                              Save {savings}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Features */}
              <CardContent className="pt-6 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {isEnterprise 
                        ? 'Unlimited devices'
                        : `${plan.features.maxDevices.toLocaleString()} devices`
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {isEnterprise 
                        ? 'Unlimited clients'
                        : `${plan.features.maxClients.toLocaleString()} clients`
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Warranty tracking</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">API access</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Export features</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced reports</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {'Priority support'}
                    </span>
                  </div>

                  {isEnterprise && (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Custom integrations</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Dedicated account manager</span>
                      </div>
                    </>
                  )}

                  {/* Add spacer for Pro plan to match Enterprise height */}
                  {!isEnterprise && (
                    <>
                      <div className="h-6"></div>
                      <div className="h-6"></div>
                    </>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  {isCurrent ? (
                    <Button disabled className="w-full h-10">
                      Current Plan
                    </Button>
                  ) : isEnterprise ? (
                    <Button 
                      onClick={handleContactUs}
                      className="w-full h-10"
                      variant="outline"
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading === plan.id}
                      className="w-full h-10"
                      variant="default"
                    >
                      {loading === plan.id ? 'Processing...' : `Get Started with ${plan.name}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Money-back Guarantee & Additional Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">100% Money-Back Guarantee</span>
        </div>
        <p className="text-sm text-muted-foreground">
          No questions asked. Cancel anytime within 14 days for a full refund.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          All plans include warranty tracking for supported manufacturers (Dell, HP, Lenovo).
        </p>
      </div>
    </div>
  );
} 