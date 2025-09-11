'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface Alert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: string;
  timestamp: string;
  acknowledged: boolean;
}

export function AlertsPanel() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const fetchAlertsData = async () => {
    try {
      const [thresholdsRes] = await Promise.all([
        fetch('/api/monitoring/alerts/thresholds').then(res => res.json()),
      ]);

      setThresholds(thresholdsRes);
      
      // Mock active alerts for demonstration
      setActiveAlerts([
        {
          id: '1',
          metric: 'cpuUsage',
          value: 85.2,
          threshold: 80,
          severity: 'high',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: '2',
          metric: 'errorRate',
          value: 6.1,
          threshold: 5,
          severity: 'medium',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          acknowledged: false,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = async (threshold: AlertThreshold) => {
    try {
      await fetch('/api/monitoring/alerts/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threshold),
      });
      
      setThresholds(prev => 
        prev.map(t => t.metric === threshold.metric ? threshold : t)
      );
      setEditingThreshold(null);
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setActiveAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getMetricDisplayName = (metric: string) => {
    const names: Record<string, string> = {
      cpuUsage: 'CPU Usage',
      memoryUsage: 'Memory Usage',
      errorRate: 'Error Rate',
      totalLatency: 'Total Latency',
      activeConnections: 'Active Connections',
    };
    return names[metric] || metric;
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
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Active Alerts
            <Badge variant={activeAlerts.filter(a => !a.acknowledged).length > 0 ? 'destructive' : 'secondary'}>
              {activeAlerts.filter(a => !a.acknowledged).length} unacknowledged
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No active alerts</p>
              <p className="text-sm">All systems are operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${
                    alert.acknowledged ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {getMetricDisplayName(alert.metric)} Alert
                        </p>
                        <p className="text-sm text-gray-600">
                          Current: {alert.value} | Threshold: {alert.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                  {alert.acknowledged && (
                    <p className="text-sm text-green-600 mt-2">✓ Acknowledged</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Thresholds Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {thresholds.map(threshold => (
              <div key={threshold.metric} className="p-4 border rounded-lg">
                {editingThreshold?.metric === threshold.metric ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Metric</label>
                        <input
                          type="text"
                          value={getMetricDisplayName(editingThreshold.metric)}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Threshold</label>
                        <input
                          type="number"
                          value={editingThreshold.threshold}
                          onChange={(e) => setEditingThreshold({
                            ...editingThreshold,
                            threshold: Number(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Operator</label>
                        <select
                          value={editingThreshold.operator}
                          onChange={(e) => setEditingThreshold({
                            ...editingThreshold,
                            operator: e.target.value as 'gt' | 'lt' | 'eq'
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="gt">Greater than</option>
                          <option value="lt">Less than</option>
                          <option value="eq">Equal to</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Severity</label>
                        <select
                          value={editingThreshold.severity}
                          onChange={(e) => setEditingThreshold({
                            ...editingThreshold,
                            severity: e.target.value as 'low' | 'medium' | 'high' | 'critical'
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`enabled-${editingThreshold.metric}`}
                        checked={editingThreshold.enabled}
                        onChange={(e) => setEditingThreshold({
                          ...editingThreshold,
                          enabled: e.target.checked
                        })}
                        className="rounded"
                      />
                      <label htmlFor={`enabled-${editingThreshold.metric}`} className="text-sm">
                        Enabled
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => updateThreshold(editingThreshold)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingThreshold(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getMetricDisplayName(threshold.metric)}</p>
                      <p className="text-sm text-gray-600">
                        Alert when {threshold.operator === 'gt' ? '>' : threshold.operator === 'lt' ? '<' : '='} {threshold.threshold}
                        {' '}({threshold.severity} severity)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={threshold.enabled ? 'default' : 'secondary'}>
                        {threshold.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingThreshold(threshold)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Mock alert history */}
            <div className="p-3 bg-gray-50 rounded text-sm">
              <div className="flex justify-between items-center">
                <span>CPU Usage exceeded 80% threshold</span>
                <span className="text-gray-500">2 hours ago</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-sm">
              <div className="flex justify-between items-center">
                <span>Memory Usage returned to normal</span>
                <span className="text-gray-500">4 hours ago</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-sm">
              <div className="flex justify-between items-center">
                <span>Error Rate spike detected</span>
                <span className="text-gray-500">6 hours ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchAlertsData}>
              Refresh Alerts
            </Button>
            <Button variant="outline" onClick={() => {/* Test alerts */}}>
              Test Alert System
            </Button>
            <Button variant="outline" onClick={() => {/* Configure notifications */}}>
              Configure Notifications
            </Button>
            <Button variant="outline" onClick={() => {/* Export alert history */}}>
              Export Alert History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}