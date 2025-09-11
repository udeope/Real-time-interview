'use client';

import { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface Plan {
  id: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  limits: Record<string, number>;
  isActive: boolean;
}

interface SubscriptionPlansProps {
  currentTier?: 'FREE' | 'PRO' | 'ENTERPRISE';
  onSubscriptionChange: () => void;
}

export function SubscriptionPlans({ currentTier, onSubscriptionChange }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (tier === currentTier) return;
    
    setProcessingTier(tier);
    
    try {
      const token = localStorage.getItem('token');
      
      if (tier === 'FREE') {
        // Downgrade to free
        const response = await fetch(`/api/subscription/downgrade/${tier}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          onSubscriptionChange();
        }
      } else {
        // Create checkout session for paid plans
        const response = await fetch('/api/subscription/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tier,
            billingCycle,
            successUrl: `${window.location.origin}/subscription/success`,
            cancelUrl: `${window.location.origin}/subscription`,
          }),
        });
        
        if (response.ok) {
          const { url } = await response.json();
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
    } finally {
      setProcessingTier(null);
    }
  };

  const formatPrice = (plan: Plan) => {
    if (plan.priceMonthly === 0) return 'Free';
    
    const price = billingCycle === 'yearly' && plan.priceYearly 
      ? plan.priceYearly / 12 
      : plan.priceMonthly;
    
    return `$${price.toFixed(0)}`;
  };

  const formatLimits = (limits: Record<string, number>) => {
    const limitTexts: string[] = [];
    
    if (limits.monthly_sessions) {
      limitTexts.push(`${limits.monthly_sessions === -1 ? 'Unlimited' : limits.monthly_sessions} sessions/month`);
    }
    
    if (limits.session_duration_minutes) {
      limitTexts.push(`${limits.session_duration_minutes === -1 ? 'Unlimited' : limits.session_duration_minutes} min sessions`);
    }
    
    if (limits.ai_responses_per_session) {
      limitTexts.push(`${limits.ai_responses_per_session === -1 ? 'Unlimited' : limits.ai_responses_per_session} AI responses`);
    }
    
    return limitTexts;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-green-600 font-semibold">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-lg shadow-lg border-2 ${
              plan.tier === currentTier
                ? 'border-blue-500'
                : 'border-gray-200'
            } ${plan.tier === 'PRO' ? 'ring-2 ring-blue-500' : ''}`}
          >
            {plan.tier === 'PRO' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            
            {plan.tier === currentTier && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}

            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600 text-sm">{plan.description}</p>
              
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  {formatPrice(plan)}
                </span>
                {plan.priceMonthly > 0 && (
                  <span className="text-gray-600 ml-1">
                    /{billingCycle === 'yearly' ? 'mo' : 'month'}
                  </span>
                )}
                {billingCycle === 'yearly' && plan.priceYearly && (
                  <div className="text-sm text-gray-500">
                    Billed ${plan.priceYearly}/year
                  </div>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Usage Limits:</h4>
                {formatLimits(plan.limits).map((limit, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    • {limit}
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={plan.tier === currentTier || processingTier === plan.tier}
                className={`mt-8 w-full py-3 px-4 rounded-md font-medium text-sm transition-colors ${
                  plan.tier === currentTier
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : processingTier === plan.tier
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.tier === 'PRO'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {processingTier === plan.tier ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                    Processing...
                  </div>
                ) : plan.tier === currentTier ? (
                  'Current Plan'
                ) : plan.tier === 'FREE' ? (
                  'Downgrade to Free'
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}