'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Mic, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Users, 
  Calendar,
  Play,
  Settings
} from 'lucide-react';
import Link from 'next/link';

// Mock data - replace with actual API calls
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

const mockStats = {
  totalSessions: 12,
  practiceHours: 8.5,
  averageScore: 85,
  upcomingInterviews: 2
};

const mockRecentSessions = [
  {
    id: '1',
    type: 'Practice',
    company: 'Tech Corp',
    position: 'Senior Developer',
    date: '2024-01-15',
    score: 88,
    duration: 45
  },
  {
    id: '2',
    type: 'Live Interview',
    company: 'StartupXYZ',
    position: 'Frontend Engineer',
    date: '2024-01-12',
    score: 92,
    duration: 60
  },
  {
    id: '3',
    type: 'Practice',
    company: 'Big Tech',
    position: 'Full Stack Developer',
    date: '2024-01-10',
    score: 79,
    duration: 30
  }
];

export default function DashboardPage() {
  const [processingStatus, setProcessingStatus] = useState({
    isListening: false,
    isTranscribing: false,
    isGeneratingResponse: false,
    lastUpdate: new Date()
  });

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <MainLayout
      user={mockUser}
      processingStatus={processingStatus}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {mockUser.name}!</h1>
          <p className="text-blue-100 mb-4">
            Ready to ace your next interview? Let's get started with some practice or jump into a live session.
          </p>
          <div className="flex space-x-3">
            <Link href="/interview">
              <Button variant="secondary" className="flex items-center space-x-2">
                <Mic className="h-4 w-4" />
                <span>Start Interview</span>
              </Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline" className="flex items-center space-x-2 text-white border-white hover:bg-white hover:text-blue-600">
                <BookOpen className="h-4 w-4" />
                <span>Practice Mode</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalSessions}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Practice Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.practiceHours}h</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.averageScore}%</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.upcomingInterviews}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Sessions</span>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={session.type === 'Live Interview' ? 'default' : 'secondary'}>
                          {session.type}
                        </Badge>
                        <span className="text-sm text-gray-500">{session.date}</span>
                      </div>
                      <h4 className="font-medium text-gray-900">{session.position}</h4>
                      <p className="text-sm text-gray-600">{session.company}</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(session.score)}`}>
                        {session.score}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{session.duration}min</p>
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
              <div className="space-y-3">
                <Link href="/interview" className="block">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                      <Mic className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Start Live Interview</h4>
                      <p className="text-sm text-gray-600">Begin a real-time interview session</p>
                    </div>
                  </div>
                </Link>

                <Link href="/practice" className="block">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-green-50 rounded-lg mr-3">
                      <BookOpen className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Practice Session</h4>
                      <p className="text-sm text-gray-600">Practice with AI-generated questions</p>
                    </div>
                  </div>
                </Link>

                <Link href="/profile" className="block">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-purple-50 rounded-lg mr-3">
                      <Settings className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Update Profile</h4>
                      <p className="text-sm text-gray-600">Manage your professional information</p>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}