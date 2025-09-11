'use client';

import { useState } from 'react';
import { AccountSettings } from '../../components/account/AccountSettings';
import { UserPreferences } from '../../components/account/UserPreferences';
import { ProfileManagement } from '../../components/account/ProfileManagement';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences'>('profile');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile, account settings, and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile', name: 'Profile' },
              { id: 'account', name: 'Account Settings' },
              { id: 'preferences', name: 'Preferences' },
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
        <div className="max-w-4xl">
          {activeTab === 'profile' && <ProfileManagement />}
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'preferences' && <UserPreferences />}
        </div>
      </div>
    </div>
  );
}