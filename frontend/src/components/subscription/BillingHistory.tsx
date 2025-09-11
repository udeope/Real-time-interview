'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
  description?: string;
  invoiceUrl?: string;
  paidAt?: string;
  dueDate?: string;
  createdAt: string;
}

export function BillingHistory() {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscription/billing-history', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBillingHistory(data);
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'text-green-600 bg-green-100';
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'REFUNDED':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
        <p className="text-sm text-gray-600 mt-1">
          View and download your payment history and invoices
        </p>
      </div>

      {billingHistory.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">No billing history available</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.paidAt || record.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {record.description || 'Subscription payment'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(record.amount, record.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(record.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.invoiceUrl ? (
                      <a
                        href={record.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}