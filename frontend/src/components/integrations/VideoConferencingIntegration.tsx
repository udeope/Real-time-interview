'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface VideoConferencingProvider {
  id: 'zoom' | 'teams' | 'meet';
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSync?: string;
  upcomingMeetings?: number;
}

interface VideoConferencingIntegrationProps {
  providers: VideoConferencingProvider[];
  onConnect: (provider: 'zoom' | 'teams' | 'meet') => void;
  onDisconnect: (provider: 'zoom' | 'teams' | 'meet') => void;
}

export const VideoConferencingIntegration: React.FC<VideoConferencingIntegrationProps> = ({
  providers,
  onConnect,
  onDisconnect,
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleConnect = async (provider: 'zoom' | 'teams' | 'meet') => {
    setLoadingProvider(provider);
    try {
      if (provider === 'meet') {
        // Google Meet uses Calendar API
        const response = await fetch('/api/integrations/calendar/google/auth-url', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        // Zoom and Teams have their own OAuth
        const response = await fetch(`/api/integrations/video-conferencing/${provider}/auth-url`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error(`Failed to initiate ${provider} connection:`, error);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'zoom' | 'teams' | 'meet') => {
    setLoadingProvider(provider);
    try {
      await onDisconnect(provider);
    } finally {
      setLoadingProvider(null);
    }
  };

  const ZoomIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#2D8CFF">
      <path d="M1.5 6A1.5 1.5 0 0 1 3 4.5h6A1.5 1.5 0 0 1 10.5 6v12A1.5 1.5 0 0 1 9 19.5H3A1.5 1.5 0 0 1 1.5 18V6zm12 0A1.5 1.5 0 0 1 15 4.5h6A1.5 1.5 0 0 1 22.5 6v12A1.5 1.5 0 0 1 21 19.5h-6A1.5 1.5 0 0 1 13.5 18V6z"/>
    </svg>
  );

  const TeamsIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6264A7">
      <path d="M20.625 5.25H15.75v13.5h4.875c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125zM14.25 5.25H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125H14.25V5.25z"/>
    </svg>
  );

  const MeetIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#00832D" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const providerIcons = {
    zoom: <ZoomIcon />,
    teams: <TeamsIcon />,
    meet: <MeetIcon />,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Conferencing</h3>
        <p className="text-sm text-gray-500">
          Connect your video conferencing platforms for seamless interview integration
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
                  {provider.isConnected && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {provider.lastSync && (
                        <span>Last synced: {new Date(provider.lastSync).toLocaleDateString()}</span>
                      )}
                      {provider.upcomingMeetings !== undefined && (
                        <span>• {provider.upcomingMeetings} upcoming meetings</span>
                      )}
                    </div>
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
                  <h5 className="text-xs font-medium text-gray-900 mb-1">Integration Features</h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Automatic interview meeting detection</li>
                    <li>• Meeting participant information</li>
                    <li>• Pre-interview technical checks</li>
                    <li>• Meeting context for AI assistance</li>
                    {provider.id === 'zoom' && <li>• Recording access (if available)</li>}
                  </ul>
                </div>

                {provider.upcomingMeetings !== undefined && provider.upcomingMeetings > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-medium text-blue-900">
                          {provider.upcomingMeetings} Upcoming Interview{provider.upcomingMeetings !== 1 ? 's' : ''}
                        </h5>
                        <p className="text-xs text-blue-700">
                          Ready for AI assistance
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                        View Details
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleConnect(provider.id)}
                    disabled={loadingProvider === provider.id}
                    variant="outline"
                    size="sm"
                  >
                    {loadingProvider === provider.id ? 'Syncing...' : 'Sync Meetings'}
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
                    Connect {provider.name}
                  </h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Detect interview meetings automatically</li>
                    <li>• Get meeting context and participant info</li>
                    <li>• Receive pre-interview preparation tips</li>
                    <li>• Enable seamless AI assistance during calls</li>
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

                {provider.id === 'meet' && (
                  <p className="text-xs text-gray-500">
                    Google Meet integration uses your Google Calendar connection
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-green-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-green-800">Seamless Integration</h5>
            <p className="text-xs text-green-700 mt-1">
              Once connected, the AI assistant will automatically detect when you're in an interview 
              and provide real-time assistance without interrupting your meeting flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};