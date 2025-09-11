'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface PracticeSession {
  id: string;
  jobTitle: string;
  industry: string;
  questionsAnswered: number;
  averageScore: number;
  duration: number;
  completedAt: Date;
  achievements: string[];
  improvementAreas: string[];
}

interface PracticeHistoryProps {
  sessions: PracticeSession[];
  userStats?: {
    totalSessions: number;
    totalQuestions: number;
    averageScore: number;
    totalPracticeTime: number;
    improvementTrend: string;
    strongestSkills: string[];
    areasForImprovement: string[];
  };
  onViewSession: (sessionId: string) => void;
  onStartNewSession: () => void;
  isLoading?: boolean;
}

export default function PracticeHistory({ 
  sessions, 
  userStats,
  onViewSession, 
  onStartNewSession,
  isLoading = false 
}: PracticeHistoryProps) {
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [filterBy, setFilterBy] = useState<string>('all');

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.averageScore - a.averageScore;
      case 'duration':
        return b.duration - a.duration;
      case 'date':
      default:
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
  });

  const filteredSessions = sortedSessions.filter(session => {
    if (filterBy === 'all') return true;
    return session.industry.toLowerCase().includes(filterBy.toLowerCase());
  });

  const industries = [...new Set(sessions.map(s => s.industry))];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Practice History</h1>
          <p className="text-gray-600 mt-2">
            Track your interview preparation progress and identify areas for improvement
          </p>
        </div>
        <Button
          onClick={onStartNewSession}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
        >
          New Practice Session
        </Button>
      </div>

      {/* Overall Stats */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">{userStats.totalSessions}</div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">{userStats.totalQuestions}</div>
            <div className="text-sm text-gray-600">Questions Practiced</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(userStats.averageScore)}`}>
              {userStats.averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(userStats.totalPracticeTime)}
            </div>
            <div className="text-sm text-gray-600">Total Practice Time</div>
          </div>
        </div>
      )}

      {/* Progress Insights */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Improvement Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trend</h3>
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getTrendIcon(userStats.improvementTrend)}</span>
              <div>
                <div className={`font-medium ${getTrendColor(userStats.improvementTrend)}`}>
                  {userStats.improvementTrend === 'improving' && 'Improving'}
                  {userStats.improvementTrend === 'declining' && 'Needs Focus'}
                  {userStats.improvementTrend === 'stable' && 'Consistent'}
                  {userStats.improvementTrend === 'no_data' && 'Insufficient Data'}
                </div>
                <div className="text-sm text-gray-600">
                  Based on recent session performance
                </div>
              </div>
            </div>
          </div>

          {/* Strongest Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Strongest Skills</h3>
            {userStats.strongestSkills.length > 0 ? (
              <div className="space-y-2">
                {userStats.strongestSkills.slice(0, 3).map((skill, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <span className="text-gray-700">{skill}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Complete more sessions to identify strengths</p>
            )}
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="duration">Duration</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Industry</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Practice Sessions Yet</h3>
            <p className="text-gray-600 mb-6">
              Start your first practice session to begin tracking your progress
            </p>
            <Button
              onClick={onStartNewSession}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              Start Practicing
            </Button>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{session.jobTitle}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                      {session.industry}
                    </span>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreBackground(session.averageScore)} ${getScoreColor(session.averageScore)}`}>
                      {session.averageScore.toFixed(1)} avg
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>{session.questionsAnswered} questions</span>
                    <span>{formatDuration(session.duration)}</span>
                    <span>{new Date(session.completedAt).toLocaleDateString()}</span>
                  </div>

                  {session.achievements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {session.achievements.slice(0, 2).map((achievement, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          🏆 {achievement}
                        </span>
                      ))}
                      {session.achievements.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{session.achievements.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => onViewSession(session.id)}
                  className="ml-4 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}