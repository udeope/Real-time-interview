'use client';

import { useState, useEffect } from 'react';
import { SubscriptionPlans } from '../../components/subscription/SubscriptionPlans';
import { CurrentSubscription } from '../../components/subscription/CurrentSubscription';
import { BillingHistory } from '../../components/subscription/BillingHistory';
import { UsageStats } from '../../components/subscription/UsageStats';

interface Subscription {
  id: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageData {
  [feature: string]: {
    usage: number;
    limit: number;
    percentage: number;
  };
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'billing' | 'usage'>('overview');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [subResponse, usageResponse] = await Promise.all([
        fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/subscription/usage', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsageStats(usageData);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionChange = () => {
    fetchSubscriptionData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your subscription, view usage, and billing information
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'plans', name: 'Plans' },
              { id: 'billing', name: 'Billing' },
              { id: 'usage', name: 'Usage' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CurrentSubscription 
                subscription={subscription} 
                onSubscriptionChange={handleSubscriptionChange}
              />
              <UsageStats usageStats={usageStats} />
            </div>
          )}

          {activeTab === 'plans' && (
            <SubscriptionPlans 
              currentTier={subscription?.tier}
              onSubscriptionChange={handleSubscriptionChange}
            />
          )}

          {activeTab === 'billing' && (
            <BillingHistory />
          )}

          {activeTab === 'usage' && (
            <div className="max-w-4xl">
              <UsageStats usageStats={usageStats} detailed />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}