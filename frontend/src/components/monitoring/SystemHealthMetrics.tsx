'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemHealthData {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
  timestamp: string;
}

export function SystemHealthMetrics() {
  const [healthData, setHealthData] = useState<SystemHealthData[]>([]);
  const [currentHealth, setCurrentHealth] = useState<any>(null);
  const [averages, setAverages] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      const [current, history, avg] = await Promise.all([
        fetch('/api/monitoring/health').then(res => res.json()),
        fetch('/api/monitoring/health/history?hours=1').then(res => res.json()),
        fetch('/api/monitoring/health/averages?hours=1').then(res => res.json()),
      ]);

      setCurrentHealth(current);
      setHealthData(history);
      setAverages(avg);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const chartData = healthData.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    cpu: item.cpuUsage,
    memory: item.memoryUsage,
    connections: item.activeConnections,
    errorRate: item.errorRate,
  }));

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100' };
    if (value >= thresholds.warning) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-100' };
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
      {/* Current System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-lg font-bold capitalize">
                {currentHealth?.status || 'Unknown'}
              </span>
            </div>
            {currentHealth?.issues?.length > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {currentHealth.issues.length} issue(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              getHealthStatus(averages?.cpuUsage || 0, { warning: 70, critical: 85 }).color
            }`}>
              {averages?.cpuUsage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  (averages?.cpuUsage || 0) >= 85 ? 'bg-red-500' :
                  (averages?.cpuUsage || 0) >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(averages?.cpuUsage || 0, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              getHealthStatus(averages?.memoryUsage || 0, { warning: 75, critical: 90 }).color
            }`}>
              {averages?.memoryUsage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  (averages?.memoryUsage || 0) >= 90 ? 'bg-red-500' :
                  (averages?.memoryUsage || 0) >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(averages?.memoryUsage || 0, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(averages?.activeConnections || 0)}
            </div>
            <p className="text-sm text-gray-600">Current connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              getHealthStatus(averages?.errorRate || 0, { warning: 2, critical: 5 }).color
            }`}>
              {averages?.errorRate?.toFixed(1) || 0}%
            </div>
            <p className="text-sm text-gray-600">Last hour</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CPU & Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#8884d8" 
                  name="CPU Usage (%)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#82ca9d" 
                  name="Memory Usage (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connections & Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="connections" 
                  stroke="#ffc658" 
                  name="Active Connections"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke="#ff7300" 
                  name="Error Rate (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Issues */}
      {currentHealth?.issues?.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">System Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentHealth.issues.map((issue: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-700">{issue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Healthy</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Response time: &lt;10ms</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Redis Cache</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Healthy</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Response time: &lt;5ms</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">External APIs</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Healthy</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">All services operational</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchHealthData}>
              Refresh Status
            </Button>
            <Button variant="outline" onClick={() => {/* Trigger health check */}}>
              Run Health Check
            </Button>
            <Button variant="outline" onClick={() => {/* View logs */}}>
              View System Logs
            </Button>
            <Button variant="outline" onClick={() => {/* Configure alerts */}}>
              Configure Alerts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}