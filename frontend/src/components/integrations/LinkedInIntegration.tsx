'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface LinkedInIntegrationProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  lastSync?: string;
}

export const LinkedInIntegration: React.FC<LinkedInIntegrationProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  lastSync,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Get LinkedIn auth URL
      const response = await fetch('/api/integrations/linkedin/auth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      
      // Redirect to LinkedIn OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Failed to initiate LinkedIn connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/linkedin/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Refresh page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to sync LinkedIn profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">LinkedIn</h3>
            <p className="text-sm text-gray-500">
              Sync your professional profile and experience
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Connected
            </span>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Benefits</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic profile synchronization</li>
              <li>• Experience and skills extraction</li>
              <li>• Enhanced response personalization</li>
              <li>• Job matching insights</li>
            </ul>
          </div>

          {lastSync && (
            <div className="text-sm text-gray-500">
              Last synced: {new Date(lastSync).toLocaleDateString()}
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={handleSync}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Connect LinkedIn to enhance your interview experience
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Automatically import your work experience</li>
              <li>• Extract skills and technologies from your profile</li>
              <li>• Get personalized response suggestions</li>
              <li>• Match your background to job requirements</li>
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Connecting...' : 'Connect LinkedIn'}
          </Button>

          <p className="text-xs text-gray-500">
            We only access your basic profile information and work experience. 
            Your data is never shared with third parties.
          </p>
        </div>
      )}
    </div>
  );
};