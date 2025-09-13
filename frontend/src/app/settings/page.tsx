import React from 'react';
import SettingsManagement from '@/components/settings/SettingsManagement';
import AccountDeletion from '@/components/settings/AccountDeletion';

export default function SettingsPage() {
  const handleAccountDeleted = () => {
    // Redirect to home page after account deletion
    window.location.href = '/';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Settings & Preferences
        </h1>
        <p className="text-gray-600">
          Customize your AI Interview Assistant experience and manage your account.
        </p>
      </div>

      <div className="space-y-8">
        <SettingsManagement />
        <AccountDeletion onAccountDeleted={handleAccountDeleted} />
      </div>
    </div>
  );
}