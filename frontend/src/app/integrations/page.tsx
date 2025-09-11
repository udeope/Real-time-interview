'use client';

import React, { useState, useEffect } from 'react';
import { LinkedInIntegration } from '../../components/integrations/LinkedInIntegration';
import { CalendarIntegration } from '../../components/integrations/CalendarIntegration';
import { VideoConferencingIntegration } from '../../components/integrations/VideoConferencingIntegration';
import { DataExportPanel } from '../../components/integrations/DataExportPanel';

interface IntegrationStatus {
  linkedin: {
    isConnected: boolean;
    lastSync?: string;
  };
  calendar: {
    google: { isConnected: boolean; lastSync?: string };
    outlook: { isConnected: boolean; lastSync?: string };
  };
  videoConferencing: {
    zoom: { isConnected: boolean; lastSync?: string; upcomingMeetings?: number };
    teams: { isConnected: boolean; lastSync?: string; upcomingMeetings?: number };
    meet: { isConnected: boolean; lastSync?: string; upcomingMeetings?: number };
  };
}

export default function IntegrationsPage() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    linkedin: { isConnected: false },
    calendar: {
      google: { isConnected: false },
      outlook: { isConnected: false },
    },
    videoConferencing: {
      zoom: { isConnected: false },
      teams: { isConnected: false },
      meet: { isConnected: false },
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      // In a real implementation, this would fetch from your API
      // For now, using mock data
      setIntegrationStatus({
        linkedin: { isConnected: false },
        calendar: {
          google: { isConnected: false },
          outlook: { isConnected: false },
        },
        videoConferencing: {
          zoom: { isConnected: false },
          teams: { isConnected: false },
          meet: { isConnected: false },
        },
      });
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInConnect = () => {
    // This will be handled by the LinkedInIntegration component
  };

  const handleLinkedInDisconnect = async () => {
    try {
      // Call API to disconnect LinkedIn
      setIntegrationStatus(prev => ({
        ...prev,
        linkedin: { isConnected: false },
      }));
    } catch (error) {
      console.error('Failed to disconnect LinkedIn:', error);
    }
  };

  const handleCalendarConnect = async (provider: 'google' | 'outlook') => {
    // This will be handled by the CalendarIntegration component
  };

  const handleCalendarDisconnect = async (provider: 'google' | 'outlook') => {
    try {
      // Call API to disconnect calendar
      setIntegrationStatus(prev => ({
        ...prev,
        calendar: {
          ...prev.calendar,
          [provider]: { isConnected: false },
        },
      }));
    } catch (error) {
      console.error(`Failed to disconnect ${provider} calendar:`, error);
    }
  };

  const handleVideoConferencingConnect = async (provider: 'zoom' | 'teams' | 'meet') => {
    // This will be handled by the VideoConferencingIntegration component
  };

  const handleVideoConferencingDisconnect = async (provider: 'zoom' | 'teams' | 'meet') => {
    try {
      // Call API to disconnect video conferencing
      setIntegrationStatus(prev => ({
        ...prev,
        videoConferencing: {
          ...prev.videoConferencing,
          [provider]: { isConnected: false },
        },
      }));
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  const calendarProviders = [
    {
      id: 'google' as const,
      name: 'Google Calendar',
      isConnected: integrationStatus.calendar.google.isConnected,
      lastSync: integrationStatus.calendar.google.lastSync,
    },
    {
      id: 'outlook' as const,
      name: 'Outlook Calendar',
      isConnected: integrationStatus.calendar.outlook.isConnected,
      lastSync: integrationStatus.calendar.outlook.lastSync,
    },
  ];

  const videoConferencingProviders = [
    {
      id: 'zoom' as const,
      name: 'Zoom',
      isConnected: integrationStatus.videoConferencing.zoom.isConnected,
      lastSync: integrationStatus.videoConferencing.zoom.lastSync,
      upcomingMeetings: integrationStatus.videoConferencing.zoom.upcomingMeetings,
    },
    {
      id: 'teams' as const,
      name: 'Microsoft Teams',
      isConnected: integrationStatus.videoConferencing.teams.isConnected,
      lastSync: integrationStatus.videoConferencing.teams.lastSync,
      upcomingMeetings: integrationStatus.videoConferencing.teams.upcomingMeetings,
    },
    {
      id: 'meet' as const,
      name: 'Google Meet',
      isConnected: integrationStatus.videoConferencing.meet.isConnected,
      lastSync: integrationStatus.videoConferencing.meet.lastSync,
      upcomingMeetings: integrationStatus.videoConferencing.meet.upcomingMeetings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your favorite tools to enhance your interview experience
          </p>
        </div>

        {/* Integration Status Overview */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                integrationStatus.linkedin.isConnected ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  integrationStatus.linkedin.isConnected ? 'text-green-600' : 'text-gray-400'
                }`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">LinkedIn</p>
              <p className="text-xs text-gray-500">
                {integrationStatus.linkedin.isConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>

            <div className="text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                integrationStatus.calendar.google.isConnected || integrationStatus.calendar.outlook.isConnected 
                  ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  integrationStatus.calendar.google.isConnected || integrationStatus.calendar.outlook.isConnected
                    ? 'text-green-600' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">Calendar</p>
              <p className="text-xs text-gray-500">
                {integrationStatus.calendar.google.isConnected || integrationStatus.calendar.outlook.isConnected 
                  ? 'Connected' : 'Not connected'}
              </p>
            </div>

            <div className="text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                Object.values(integrationStatus.videoConferencing).some(vc => vc.isConnected)
                  ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  Object.values(integrationStatus.videoConferencing).some(vc => vc.isConnected)
                    ? 'text-green-600' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">Video Conferencing</p>
              <p className="text-xs text-gray-500">
                {Object.values(integrationStatus.videoConferencing).some(vc => vc.isConnected)
                  ? 'Connected' : 'Not connected'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">Data Export</p>
              <p className="text-xs text-gray-500">Always available</p>
            </div>
          </div>
        </div>

        {/* Integration Sections */}
        <div className="space-y-8">
          {/* LinkedIn Integration */}
          <LinkedInIntegration
            isConnected={integrationStatus.linkedin.isConnected}
            onConnect={handleLinkedInConnect}
            onDisconnect={handleLinkedInDisconnect}
            lastSync={integrationStatus.linkedin.lastSync}
          />

          {/* Calendar Integration */}
          <CalendarIntegration
            providers={calendarProviders}
            onConnect={handleCalendarConnect}
            onDisconnect={handleCalendarDisconnect}
          />

          {/* Video Conferencing Integration */}
          <VideoConferencingIntegration
            providers={videoConferencingProviders}
            onConnect={handleVideoConferencingConnect}
            onDisconnect={handleVideoConferencingDisconnect}
          />

          {/* Data Export */}
          <DataExportPanel />
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Need Help?</h3>
              <p className="mt-1 text-blue-700">
                Check out our integration guides and documentation to get the most out of your connected tools.
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Integration Guide →
                </a>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  API Documentation →
                </a>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Contact Support →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}