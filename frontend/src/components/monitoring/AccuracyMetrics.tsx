'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AccuracyData {
  id: string;
  transcriptionId: string;
  wordErrorRate: number;
  confidenceScore: number;
  actualText?: string;
  transcribedText: string;
  timestamp: string;
}

interface AccuracyMetricsProps {
  data: AccuracyData[];
}

export function AccuracyMetrics({ data }: AccuracyMetricsProps) {
  // Process data for charts
  const chartData = data.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    wer: item.wordErrorRate * 100, // Convert to percentage
    confidence: item.confidenceScore * 100, // Convert to percentage
  }));

  // Calculate statistics
  const stats = {
    avgWER: data.length > 0 ? 
      (data.reduce((sum, item) => sum + item.wordErrorRate, 0) / data.length * 100) : 0,
    avgConfidence: data.length > 0 ? 
      (data.reduce((sum, item) => sum + item.confidenceScore, 0) / data.length * 100) : 0,
    bestWER: data.length > 0 ? Math.min(...data.map(item => item.wordErrorRate)) * 100 : 0,
    worstWER: data.length > 0 ? Math.max(...data.map(item => item.wordErrorRate)) * 100 : 0,
    highAccuracyCount: data.filter(item => item.wordErrorRate <= 0.05).length, // <= 5% WER
    lowConfidenceCount: data.filter(item => item.confidenceScore < 0.8).length, // < 80% confidence
  };

  // WER distribution
  const werBuckets = [
    { range: '0-2%', count: data.filter(item => item.wordErrorRate <= 0.02).length },
    { range: '2-5%', count: data.filter(item => item.wordErrorRate > 0.02 && item.wordErrorRate <= 0.05).length },
    { range: '5-10%', count: data.filter(item => item.wordErrorRate > 0.05 && item.wordErrorRate <= 0.10).length },
    { range: '10%+', count: data.filter(item => item.wordErrorRate > 0.10).length },
  ];

  // Confidence distribution
  const confidenceBuckets = [
    { range: '90-100%', count: data.filter(item => item.confidenceScore >= 0.9).length },
    { range: '80-90%', count: data.filter(item => item.confidenceScore >= 0.8 && item.confidenceScore < 0.9).length },
    { range: '70-80%', count: data.filter(item => item.confidenceScore >= 0.7 && item.confidenceScore < 0.8).length },
    { range: '<70%', count: data.filter(item => item.confidenceScore < 0.7).length },
  ];

  return (
    <div className="space-y-6">
      {/* Accuracy Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg WER</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgWER <= 5 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.avgWER.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Target: ≤5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgConfidence >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
              {stats.avgConfidence.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Target: ≥95%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best WER</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.bestWER.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Worst WER</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.worstWER.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.highAccuracyCount}</div>
            <p className="text-sm text-gray-600">
              {data.length > 0 ? ((stats.highAccuracyCount / data.length) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowConfidenceCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.lowConfidenceCount}
            </div>
            <p className="text-sm text-gray-600">
              {data.length > 0 ? ((stats.lowConfidenceCount / data.length) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Accuracy Trends</CardTitle>
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
                dataKey="wer" 
                stroke="#ff7300" 
                name="Word Error Rate (%)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="confidence" 
                stroke="#387908" 
                name="Confidence (%)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* WER Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Word Error Rate Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={werBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={confidenceBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#387908" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Alerts */}
      {(stats.avgWER > 5 || stats.lowConfidenceCount > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Accuracy Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.avgWER > 5 && (
                <p className="text-yellow-700">
                  ⚠️ Average WER ({stats.avgWER.toFixed(1)}%) is above the 5% target
                </p>
              )}
              {stats.lowConfidenceCount > 0 && (
                <p className="text-yellow-700">
                  ⚠️ {stats.lowConfidenceCount} transcriptions have low confidence scores (&lt;80%)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Low Accuracy Events */}
      {data.filter(item => item.wordErrorRate > 0.1 || item.confidenceScore < 0.7).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Low Accuracy Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data
                .filter(item => item.wordErrorRate > 0.1 || item.confidenceScore < 0.7)
                .slice(0, 10)
                .map(item => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Transcription: {item.transcriptionId.slice(0, 8)}...
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={item.wordErrorRate > 0.1 ? 'text-red-600' : 'text-gray-600'}>
                        WER: {(item.wordErrorRate * 100).toFixed(1)}%
                      </span>
                      <span className={item.confidenceScore < 0.7 ? 'text-red-600' : 'text-gray-600'}>
                        Confidence: {(item.confidenceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Transcribed:</strong> {item.transcribedText.slice(0, 100)}...</p>
                      {item.actualText && (
                        <p><strong>Actual:</strong> {item.actualText.slice(0, 100)}...</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}