'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceData {
  id: string;
  sessionId: string;
  userId: string;
  transcriptionLatency: number;
  responseGenerationLatency: number;
  totalLatency: number;
  timestamp: string;
}

interface PerformanceMetricsProps {
  data: PerformanceData[];
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  // Process data for charts
  const chartData = data.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    transcription: item.transcriptionLatency,
    responseGeneration: item.responseGenerationLatency,
    total: item.totalLatency,
  }));

  // Calculate statistics
  const stats = {
    avgTranscriptionLatency: data.length > 0 ? 
      Math.round(data.reduce((sum, item) => sum + item.transcriptionLatency, 0) / data.length) : 0,
    avgResponseLatency: data.length > 0 ? 
      Math.round(data.reduce((sum, item) => sum + item.responseGenerationLatency, 0) / data.length) : 0,
    avgTotalLatency: data.length > 0 ? 
      Math.round(data.reduce((sum, item) => sum + item.totalLatency, 0) / data.length) : 0,
    maxLatency: data.length > 0 ? Math.max(...data.map(item => item.totalLatency)) : 0,
    minLatency: data.length > 0 ? Math.min(...data.map(item => item.totalLatency)) : 0,
    slaViolations: data.filter(item => item.totalLatency > 2000).length,
  };

  // Latency distribution
  const latencyBuckets = [
    { range: '0-500ms', count: data.filter(item => item.totalLatency <= 500).length },
    { range: '500ms-1s', count: data.filter(item => item.totalLatency > 500 && item.totalLatency <= 1000).length },
    { range: '1-2s', count: data.filter(item => item.totalLatency > 1000 && item.totalLatency <= 2000).length },
    { range: '2s+', count: data.filter(item => item.totalLatency > 2000).length },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTranscriptionLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Gen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTotalLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maxLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Min Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.minLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">SLA Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.slaViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.slaViolations}
            </div>
            <p className="text-sm text-gray-600">
              {data.length > 0 ? ((stats.slaViolations / data.length) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="transcription" 
                stroke="#8884d8" 
                name="Transcription"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="responseGeneration" 
                stroke="#82ca9d" 
                name="Response Generation"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#ffc658" 
                name="Total Latency"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Latency Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={latencyBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Alerts */}
      {stats.slaViolations > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Performance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-red-700">
                ⚠️ {stats.slaViolations} requests exceeded the 2-second SLA target
              </p>
              {stats.avgTotalLatency > 2000 && (
                <p className="text-red-700">
                  ⚠️ Average latency ({stats.avgTotalLatency}ms) is above SLA threshold
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent High Latency Events */}
      {data.filter(item => item.totalLatency > 2000).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent High Latency Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data
                .filter(item => item.totalLatency > 2000)
                .slice(0, 10)
                .map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      Session: {item.sessionId.slice(0, 8)}...
                    </span>
                    <span className="text-sm font-medium text-red-600">
                      {item.totalLatency}ms
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}