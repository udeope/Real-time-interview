'use client';

import React from 'react';
import { Button } from '../ui/Button';

interface PracticeSessionSummaryProps {
  summary: {
    id: string;
    jobTitle: string;
    industry: string;
    questionsAnswered: number;
    averageScore: number;
    duration: number;
    completedAt: Date;
    achievements: string[];
    improvementAreas: string[];
  };
  analytics?: {
    performanceByType: Record<string, any>;
    timeManagement: any;
    consistencyScore: number;
    progressMetrics: any;
  };
  onStartNewSession: () => void;
  onViewHistory: () => void;
}

export default function PracticeSessionSummary({ 
  summary, 
  analytics,
  onStartNewSession, 
  onViewHistory 
}: PracticeSessionSummaryProps) {
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

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPerformanceLevel = (score: number): string => {
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 6) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${getScoreBackground(summary.averageScore)}`}>
            <span className={`text-3xl font-bold ${getScoreColor(summary.averageScore)}`}>
              {summary.averageScore.toFixed(1)}
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Session Complete!</h2>
        <p className="text-gray-600">
          {summary.jobTitle} • {summary.industry}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.questionsAnswered}</div>
          <div className="text-sm text-gray-600">Questions Answered</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(summary.averageScore)}`}>
            {getPerformanceLevel(summary.averageScore)}
          </div>
          <div className="text-sm text-gray-600">Overall Performance</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatDuration(summary.duration)}</div>
          <div className="text-sm text-gray-600">Session Duration</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {analytics?.consistencyScore || 0}%
          </div>
          <div className="text-sm text-gray-600">Consistency</div>
        </div>
      </div>

      {/* Performance by Question Type */}
      {analytics?.performanceByType && Object.keys(analytics.performanceByType).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Question Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(analytics.performanceByType).map(([type, data]: [string, any]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 capitalize">{type}</span>
                  <span className={`font-bold ${getScoreColor(data.averageScore)}`}>
                    {data.averageScore.toFixed(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {data.questionsAnswered} questions • {data.performance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {summary.achievements.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.achievements.map((achievement, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span className="text-green-800">{achievement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Improvement */}
      {summary.improvementAreas.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            Focus Areas for Next Session
          </h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <ul className="space-y-2">
              {summary.improvementAreas.map((area, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-600 mr-2 mt-1">•</span>
                  <span className="text-orange-800">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Time Management */}
      {analytics?.timeManagement && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Management</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-blue-800 font-medium">Time Compliance</div>
                <div className="text-lg font-bold text-blue-900">
                  {analytics.timeManagement.timeComplianceRate}%
                </div>
                <div className="text-sm text-blue-700">
                  {analytics.timeManagement.withinTimeLimit} of {analytics.timeManagement.totalQuestions} within limit
                </div>
              </div>
              {analytics.timeManagement.averageOvertime > 0 && (
                <div>
                  <div className="text-sm text-blue-800 font-medium">Average Overtime</div>
                  <div className="text-lg font-bold text-blue-900">
                    {analytics.timeManagement.averageOvertime}s
                  </div>
                  <div className="text-sm text-blue-700">
                    When exceeding time limits
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
        <Button
          onClick={onStartNewSession}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium"
        >
          Start New Practice Session
        </Button>
        <Button
          onClick={onViewHistory}
          className="flex-1 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 py-3 px-6 rounded-md font-medium"
        >
          View Practice History
        </Button>
      </div>

      {/* Session Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Session completed on {new Date(summary.completedAt).toLocaleDateString()} at{' '}
        {new Date(summary.completedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}