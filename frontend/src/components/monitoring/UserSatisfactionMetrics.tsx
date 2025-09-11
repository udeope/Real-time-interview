'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface SatisfactionData {
  averageRating: number;
  totalResponses: number;
  ratingDistribution: Record<number, number>;
  featureSatisfaction: Record<string, number>;
}

interface SatisfactionMetricsProps {
  data: SatisfactionData;
}

export function UserSatisfactionMetrics({ data }: SatisfactionMetricsProps) {
  const [trends, setTrends] = useState<any[]>([]);
  const [npsScore, setNpsScore] = useState<number>(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdditionalData();
  }, []);

  const fetchAdditionalData = async () => {
    try {
      const [trendsRes, npsRes, alertsRes] = await Promise.all([
        fetch('/api/monitoring/satisfaction/trends').then(res => res.json()),
        fetch('/api/monitoring/satisfaction/nps').then(res => res.json()),
        fetch('/api/monitoring/satisfaction/alerts').then(res => res.json()),
      ]);

      setTrends(trendsRes);
      setNpsScore(npsRes);
      setAlerts(alertsRes);
    } catch (error) {
      console.error('Failed to fetch additional satisfaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process rating distribution for chart
  const ratingChartData = Object.entries(data?.ratingDistribution || {}).map(([rating, count]) => ({
    rating: `${rating} Star${rating !== '1' ? 's' : ''}`,
    count,
    percentage: data?.totalResponses ? (count / data.totalResponses * 100).toFixed(1) : 0,
  }));

  // Process feature satisfaction for chart
  const featureChartData = Object.entries(data?.featureSatisfaction || {}).map(([feature, rating]) => ({
    feature: feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    rating: Number(rating.toFixed(2)),
  }));

  // Colors for charts
  const ratingColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Calculate satisfaction level
  const getSatisfactionLevel = (rating: number) => {
    if (rating >= 4.5) return { level: 'Excellent', color: 'text-green-600' };
    if (rating >= 4.0) return { level: 'Good', color: 'text-green-500' };
    if (rating >= 3.5) return { level: 'Fair', color: 'text-yellow-500' };
    if (rating >= 3.0) return { level: 'Poor', color: 'text-orange-500' };
    return { level: 'Critical', color: 'text-red-600' };
  };

  const satisfactionLevel = getSatisfactionLevel(data?.averageRating || 0);

  return (
    <div className="space-y-6">
      {/* Satisfaction Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${satisfactionLevel.color}`}>
              {data?.averageRating?.toFixed(1) || 'N/A'}
            </div>
            <p className="text-sm text-gray-600">{satisfactionLevel.level}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalResponses || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              npsScore >= 50 ? 'text-green-600' : 
              npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {npsScore || 0}
            </div>
            <p className="text-sm text-gray-600">
              {npsScore >= 50 ? 'Excellent' : npsScore >= 0 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {alerts.length}
            </div>
            <p className="text-sm text-gray-600">Recent alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="averageRating" 
                  stroke="#8884d8" 
                  name="Average Rating"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rating Distribution and Feature Satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="feature" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="rating" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Low Satisfaction Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert, index) => (
                <div key={index} className="p-3 bg-white rounded border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-800">
                        {alert.rating}/5 stars - {alert.feature}
                      </p>
                      <p className="text-sm text-gray-600">
                        User: {alert.userName || alert.userEmail}
                      </p>
                      {alert.feedback && (
                        <p className="text-sm text-gray-700 mt-1">
                          "{alert.feedback}"
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureChartData.map((feature, index) => (
              <div key={feature.feature} className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">{feature.feature}</h4>
                <div className="flex items-center mt-2">
                  <div className={`text-2xl font-bold ${
                    feature.rating >= 4.5 ? 'text-green-600' :
                    feature.rating >= 4.0 ? 'text-green-500' :
                    feature.rating >= 3.5 ? 'text-yellow-500' :
                    feature.rating >= 3.0 ? 'text-orange-500' : 'text-red-600'
                  }`}>
                    {feature.rating}
                  </div>
                  <span className="text-gray-500 ml-1">/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      feature.rating >= 4.5 ? 'bg-green-600' :
                      feature.rating >= 4.0 ? 'bg-green-500' :
                      feature.rating >= 3.5 ? 'bg-yellow-500' :
                      feature.rating >= 3.0 ? 'bg-orange-500' : 'bg-red-600'
                    }`}
                    style={{ width: `${(feature.rating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.open('/api/monitoring/satisfaction/export', '_blank')}>
              Export Feedback Data
            </Button>
            <Button variant="outline" onClick={fetchAdditionalData}>
              Refresh Data
            </Button>
            <Button variant="outline" onClick={() => {/* Navigate to detailed feedback */}}>
              View Detailed Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}