'use client';

import { useState } from 'react';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface Subscription {
  id: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface CurrentSubscriptionProps {
  subscription: Subscription | null;
  onSubscriptionChange: () => void;
}

export function CurrentSubscription({ subscription, onSubscriptionChange }: CurrentSubscriptionProps) {
  const [loading, setLoading] = useState(false);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscription/cancel', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        onSubscriptionChange();
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return 'text-gray-600 bg-gray-100';
      case 'PRO':
        return 'text-blue-600 bg-blue-100';
      case 'ENTERPRISE':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!subscription) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No subscription found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
        <div className="flex space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(subscription.tier)}`}>
            {subscription.tier}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
            {subscription.status}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {subscription.tier !== 'FREE' && (
          <>
            <div className="flex items-center">
              <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Billing Status</p>
                <p className="text-sm text-gray-600">
                  {subscription.status === 'active' ? 'Active and up to date' : subscription.status}
                </p>
              </div>
            </div>

            {subscription.currentPeriodEnd && (
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Subscription Canceled
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your subscription will end on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the end of your billing period'}. 
                  You'll still have access to all features until then.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription.status === 'trialing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Free Trial Active
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Your free trial is active until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the trial period ends'}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {subscription.tier !== 'FREE' && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleCancelSubscription}
            disabled={loading}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Canceling...' : 'Cancel Subscription'}
          </button>
        </div>
      )}
    </div>
  );
}