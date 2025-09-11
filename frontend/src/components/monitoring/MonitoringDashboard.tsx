'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AccuracyMetrics } from './AccuracyMetrics';
import { UserSatisfactionMetrics } from './UserSatisfactionMetrics';
import { SystemHealthMetrics } from './SystemHealthMetrics';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AlertsPanel } from './AlertsPanel';

interface MonitoringData {
  systemHealth: {
    status: string;
    issues: string[];
  };
  performance: any[];
  accuracy: any[];
  satisfaction: any;
  analytics: any;
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    fetchMonitoringData();
    
    const interval = setInterval(fetchMonitoringData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  const fetchMonitoringData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const [health, performance, accuracy, satisfaction, analytics] = await Promise.all([
        fetch('/api/monitoring/health').then(res => res.json()),
        fetch(`/api/monitoring/performance?start=${startDate.toISOString()}&end=${endDate.toISOString()}`).then(res => res.json()),
        fetch(`/api/monitoring/accuracy?start=${startDate.toISOString()}&end=${endDate.toISOString()}`).then(res => res.json()),
        fetch(`/api/monitoring/satisfaction?start=${startDate.toISOString()}&end=${endDate.toISOString()}`).then(res => res.json()),
        fetch(`/api/monitoring/analytics/bi-report?start=${startDate.toISOString()}&end=${endDate.toISOString()}`).then(res => res.json()),
      ]);

      setData({
        systemHealth: health,
        performance,
        accuracy,
        satisfaction,
        analytics,
      });
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <select
            value={refreshInterval}
            onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          
          <Button onClick={fetchMonitoringData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                data?.systemHealth.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-2xl font-bold capitalize">
                {data?.systemHealth.status || 'Unknown'}
              </span>
            </div>
            {data?.systemHealth.issues && data.systemHealth.issues.length > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {data.systemHealth.issues.length} issue(s) detected
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.analytics?.activeUsers || 0}
            </div>
            <p className="text-sm text-gray-600">
              Total: {data?.analytics?.totalUsers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.analytics?.sessionsToday || 0}
            </div>
            <p className="text-sm text-gray-600">
              Avg Duration: {Math.round(data?.analytics?.averageSessionDuration || 0)}min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.satisfaction?.averageRating?.toFixed(1) || 'N/A'}/5
            </div>
            <p className="text-sm text-gray-600">
              {data?.satisfaction?.totalResponses || 0} responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceMetrics data={data?.performance || []} />
        </TabsContent>

        <TabsContent value="accuracy">
          <AccuracyMetrics data={data?.accuracy || []} />
        </TabsContent>

        <TabsContent value="satisfaction">
          <UserSatisfactionMetrics data={data?.satisfaction} />
        </TabsContent>

        <TabsContent value="system">
          <SystemHealthMetrics />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard data={data?.analytics} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}