'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface CalendarProvider {
  id: 'google' | 'outlook';
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSync?: string;
}

interface CalendarIntegrationProps {
  providers: CalendarProvider[];
  onConnect: (provider: 'google' | 'outlook') => void;
  onDisconnect: (provider: 'google' | 'outlook') => void;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  providers,
  onConnect,
  onDisconnect,
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleConnect = async (provider: 'google' | 'outlook') => {
    setLoadingProvider(provider);
    try {
      // Get calendar auth URL
      const response = await fetch(`/api/integrations/calendar/${provider}/auth-url`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      
      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`Failed to initiate ${provider} connection:`, error);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    setLoadingProvider(provider);
    try {
      await onDisconnect(provider);
    } finally {
      setLoadingProvider(null);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const OutlookIcon = () => (
    <svg className="w-6 h-6" fill="#0078D4" viewBox="0 0 24 24">
      <path d="M7.462 0C3.348 0 0 3.348 0 7.462v9.076C0 20.652 3.348 24 7.462 24h9.076C20.652 24 24 20.652 24 16.538V7.462C24 3.348 20.652 0 16.538 0H7.462zM12 6c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6zm0 2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
    </svg>
  );

  const providerIcons = {
    google: <GoogleIcon />,
    outlook: <OutlookIcon />,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Integration</h3>
        <p className="text-sm text-gray-500">
          Connect your calendar to get context about upcoming interviews
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => (
          <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {providerIcons[provider.id]}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{provider.name}</h4>
                  {provider.isConnected && provider.lastSync && (
                    <p className="text-xs text-gray-500">
                      Last synced: {new Date(provider.lastSync).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {provider.isConnected && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                )}
              </div>
            </div>

            {provider.isConnected ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-medium text-gray-900 mb-1">Features</h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Automatic interview detection</li>
                    <li>• Meeting context extraction</li>
                    <li>• Company and role information</li>
                    <li>• Interview preparation reminders</li>
                  </ul>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleConnect(provider.id)}
                    disabled={loadingProvider === provider.id}
                    variant="outline"
                    size="sm"
                  >
                    {loadingProvider === provider.id ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={loadingProvider === provider.id}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <h5 className="text-xs font-medium text-blue-900 mb-1">
                    Connect {provider.name} Calendar
                  </h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Automatically detect interview meetings</li>
                    <li>• Extract company and role information</li>
                    <li>• Get meeting preparation suggestions</li>
                    <li>• Sync interview context to your sessions</li>
                  </ul>
                </div>

                <Button
                  onClick={() => handleConnect(provider.id)}
                  disabled={loadingProvider === provider.id}
                  size="sm"
                  className="w-full"
                >
                  {loadingProvider === provider.id ? 'Connecting...' : `Connect ${provider.name}`}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-yellow-800">Privacy Notice</h5>
            <p className="text-xs text-yellow-700 mt-1">
              We only access calendar events to detect interview meetings. 
              Your calendar data is processed securely and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};