'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  sessionsToday: number;
  averageSessionDuration: number;
  featureAdoption: Record<string, number>;
  conversionRate: number;
  churnRate: number;
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [featureUsage, setFeatureUsage] = useState<any[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<any>(null);
  const [topFeatures, setTopFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [features, engagement, top] = await Promise.all([
        fetch('/api/monitoring/analytics/features').then(res => res.json()),
        fetch('/api/monitoring/analytics/engagement').then(res => res.json()),
        fetch('/api/monitoring/analytics/top-features').then(res => res.json()),
      ]);

      setFeatureUsage(Object.entries(features).map(([feature, data]: [string, any]) => ({
        feature: feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        usage: data.usage,
        adoptionRate: data.adoptionRate,
      })));
      setEngagementMetrics(engagement);
      setTopFeatures(top);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process feature adoption for pie chart
  const featureAdoptionData = Object.entries(data?.featureAdoption || {}).map(([feature, rate]) => ({
    name: feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    value: Number(rate.toFixed(1)),
  }));

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

  // Calculate growth metrics (mock data for demonstration)
  const growthMetrics = {
    userGrowth: 12.5, // % growth
    sessionGrowth: 8.3,
    engagementGrowth: 15.2,
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.totalUsers || 0}</div>
            <p className="text-sm text-green-600">+{growthMetrics.userGrowth}% this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.activeUsers || 0}</div>
            <p className="text-sm text-gray-600">
              {data?.totalUsers ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.conversionRate?.toFixed(1) || 0}%</div>
            <p className="text-sm text-gray-600">Registration to active use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(data?.churnRate || 0) > 10 ? 'text-red-600' : 'text-green-600'}`}>
              {data?.churnRate?.toFixed(1) || 0}%
            </div>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Session Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.sessionsToday || 0}</div>
            <p className="text-sm text-green-600">+{growthMetrics.sessionGrowth}% vs yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data?.averageSessionDuration || 0)}min</div>
            <p className="text-sm text-green-600">+{growthMetrics.engagementGrowth}% engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions per User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.activeUsers ? (data.sessionsToday / data.activeUsers).toFixed(1) : 0}
            </div>
            <p className="text-sm text-gray-600">Average per active user</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Adoption and Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Adoption Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={featureAdoptionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {featureAdoptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Usage Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="usage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Features */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topFeatures.slice(0, 10).map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{feature.feature}</p>
                    <p className="text-sm text-gray-600">{feature.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{feature._count.feature}</p>
                  <p className="text-sm text-gray-600">uses</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Engagement Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Daily Active Users</span>
                <span className="text-lg font-bold">{engagementMetrics?.dailyActiveUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Sessions</span>
                <span className="text-lg font-bold">{engagementMetrics?.totalSessions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg Session Duration</span>
                <span className="text-lg font-bold">{engagementMetrics?.averageSessionDuration || 0}min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">User Retention</span>
                <span className="text-lg font-bold text-green-600">
                  {(100 - (data?.churnRate || 0)).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Feature Adoption</span>
                <span className="text-lg font-bold">
                  {featureAdoptionData.length > 0 ? 
                    (featureAdoptionData.reduce((sum, f) => sum + f.value, 0) / featureAdoptionData.length).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">User Satisfaction</span>
                <span className="text-lg font-bold text-green-600">4.2/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.churnRate > 10 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium">High Churn Rate Alert</p>
                <p className="text-red-700 text-sm">
                  Churn rate is {data.churnRate.toFixed(1)}%. Consider improving user onboarding and engagement.
                </p>
              </div>
            )}
            
            {data?.conversionRate < 50 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 font-medium">Low Conversion Rate</p>
                <p className="text-yellow-700 text-sm">
                  Only {data.conversionRate.toFixed(1)}% of users are converting. Focus on improving the onboarding experience.
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 font-medium">Growth Opportunity</p>
              <p className="text-blue-700 text-sm">
                Consider promoting the most popular features to increase overall engagement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.open('/api/monitoring/analytics/export', '_blank')}>
              Export Analytics Data
            </Button>
            <Button variant="outline" onClick={fetchAnalyticsData}>
              Refresh Data
            </Button>
            <Button variant="outline" onClick={() => {/* Generate report */}}>
              Generate Report
            </Button>
            <Button variant="outline" onClick={() => {/* Configure tracking */}}>
              Configure Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}