'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Calendar, 
  Video, 
  Linkedin, 
  Settings,
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface IntegrationStatus {
  connected: boolean;
  status: string;
  lastSync?: string;
  syncData?: any;
  connectedAt?: string;
}

interface IntegrationData {
  linkedin: IntegrationStatus;
  calendar: {
    google: IntegrationStatus;
    outlook: IntegrationStatus;
  };
  videoConferencing: {
    zoom: IntegrationStatus;
    teams: IntegrationStatus;
    meet: IntegrationStatus;
  };
  stats: {
    totalIntegrations: number;
    activeIntegrations: number;
    calendarEvents: number;
    videoMeetings: number;
    lastSync?: { lastSync: string };
  };
}

export default function IntegrationManagement() {
  const [integrations, setIntegrations] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      } else {
        throw new Error('Failed to fetch integration status');
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: string, provider?: string) => {
    try {
      const endpoint = provider 
        ? `/api/integrations/${type}/${provider}/auth-url`
        : `/api/integrations/${type}/auth-url`;
      
      const response = await fetch(`${endpoint}?state=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        window.open(authUrl, '_blank', 'width=600,height=700');
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate connection',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async (type: string, provider?: string) => {
    try {
      const endpoint = provider 
        ? `/api/integrations/${type}/${provider}`
        : `/api/integrations/${type}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Integration disconnected successfully',
        });
        fetchIntegrationStatus();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async (type: string, provider?: string) => {
    const syncKey = provider ? `${type}-${provider}` : type;
    setSyncing(syncKey);

    try {
      const endpoint = provider 
        ? `/api/integrations/${type}/${provider}/sync`
        : `/api/integrations/${type}/sync`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Integration synced successfully',
        });
        fetchIntegrationStatus();
      } else {
        throw new Error('Failed to sync');
      }
    } catch (error) {
      console.error('Error syncing integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync integration',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing('all');

    try {
      const response = await fetch('/api/integrations/sync-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: `Synced ${result.syncedCount} integrations`,
        });
        fetchIntegrationStatus();
      } else {
        throw new Error('Failed to sync all');
      }
    } catch (error) {
      console.error('Error syncing all integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync all integrations',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    if (status.connected) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    }
    return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading integrations...
      </div>
    );
  }

  if (!integrations) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p>Failed to load integration status</p>
        <Button onClick={fetchIntegrationStatus} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Integration Overview
          </CardTitle>
          <CardDescription>
            Manage your external service connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{integrations.stats.activeIntegrations}</div>
              <div className="text-sm text-gray-600">Active Integrations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{integrations.stats.calendarEvents}</div>
              <div className="text-sm text-gray-600">Calendar Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{integrations.stats.videoMeetings}</div>
              <div className="text-sm text-gray-600">Video Meetings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{integrations.stats.totalIntegrations}</div>
              <div className="text-sm text-gray-600">Total Integrations</div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Last sync: {formatLastSync(integrations.stats.lastSync?.lastSync)}
            </div>
            <Button 
              onClick={handleSyncAll}
              disabled={syncing === 'all'}
              size="sm"
            >
              {syncing === 'all' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Linkedin className="w-5 h-5 mr-2 text-blue-600" />
            LinkedIn Integration
          </CardTitle>
          <CardDescription>
            Sync your professional profile and experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            {getStatusBadge(integrations.linkedin)}
            <div className="flex gap-2">
              {integrations.linkedin.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('linkedin')}
                    disabled={syncing === 'linkedin'}
                  >
                    {syncing === 'linkedin' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('linkedin')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('linkedin')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect LinkedIn
                </Button>
              )}
            </div>
          </div>
          
          {integrations.linkedin.connected && (
            <div className="text-sm text-gray-600">
              <p>Last sync: {formatLastSync(integrations.linkedin.lastSync)}</p>
              {integrations.linkedin.syncData && (
                <p>Profile ID: {integrations.linkedin.syncData.profileId}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-600" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Connect your calendars to detect interview schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <div className="flex justify-between items-center p-3 border rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Google Calendar</div>
                <div className="text-sm text-gray-600">
                  Last sync: {formatLastSync(integrations.calendar.google.lastSync)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(integrations.calendar.google)}
              {integrations.calendar.google.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('calendar', 'google')}
                    disabled={syncing === 'calendar-google'}
                  >
                    {syncing === 'calendar-google' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('calendar', 'google')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('calendar', 'google')}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Outlook Calendar */}
          <div className="flex justify-between items-center p-3 border rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Outlook Calendar</div>
                <div className="text-sm text-gray-600">
                  Last sync: {formatLastSync(integrations.calendar.outlook.lastSync)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(integrations.calendar.outlook)}
              {integrations.calendar.outlook.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('calendar', 'outlook')}
                    disabled={syncing === 'calendar-outlook'}
                  >
                    {syncing === 'calendar-outlook' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('calendar', 'outlook')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('calendar', 'outlook')}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Conferencing Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2 text-purple-600" />
            Video Conferencing Integrations
          </CardTitle>
          <CardDescription>
            Connect your video platforms for meeting context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Zoom */}
          <div className="flex justify-between items-center p-3 border rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Video className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Zoom</div>
                <div className="text-sm text-gray-600">
                  Last sync: {formatLastSync(integrations.videoConferencing.zoom.lastSync)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(integrations.videoConferencing.zoom)}
              {integrations.videoConferencing.zoom.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('video', 'zoom')}
                    disabled={syncing === 'video-zoom'}
                  >
                    {syncing === 'video-zoom' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('video', 'zoom')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('video', 'zoom')}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Microsoft Teams */}
          <div className="flex justify-between items-center p-3 border rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Video className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Microsoft Teams</div>
                <div className="text-sm text-gray-600">
                  Last sync: {formatLastSync(integrations.videoConferencing.teams.lastSync)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(integrations.videoConferencing.teams)}
              {integrations.videoConferencing.teams.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('video', 'teams')}
                    disabled={syncing === 'video-teams'}
                  >
                    {syncing === 'video-teams' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('video', 'teams')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('video', 'teams')}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Google Meet */}
          <div className="flex justify-between items-center p-3 border rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Video className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Google Meet</div>
                <div className="text-sm text-gray-600">
                  Last sync: {formatLastSync(integrations.videoConferencing.meet.lastSync)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(integrations.videoConferencing.meet)}
              {integrations.videoConferencing.meet.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('video', 'meet')}
                    disabled={syncing === 'video-meet'}
                  >
                    {syncing === 'video-meet' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('video', 'meet')}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('video', 'meet')}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}