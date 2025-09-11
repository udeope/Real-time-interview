'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface PracticeSetupProps {
  onStartPractice: (config: PracticeConfig) => void;
  isLoading?: boolean;
}

interface PracticeConfig {
  jobTitle: string;
  industry: string;
  difficulty: 'junior' | 'mid' | 'senior';
  questionTypes: string[];
  questionCount: number;
  duration?: number;
}

const INDUSTRIES = [
  'Software Engineering',
  'Data Science',
  'Product Management',
  'Marketing',
  'Sales',
  'Finance',
  'Consulting',
  'Healthcare',
  'Education',
  'General',
];

const QUESTION_TYPES = [
  { id: 'technical', label: 'Technical', description: 'Role-specific technical questions' },
  { id: 'behavioral', label: 'Behavioral', description: 'Past experience and situations' },
  { id: 'situational', label: 'Situational', description: 'Hypothetical scenarios' },
  { id: 'cultural', label: 'Cultural Fit', description: 'Values and work style' },
];

export default function PracticeSetup({ onStartPractice, isLoading = false }: PracticeSetupProps) {
  const [config, setConfig] = useState<PracticeConfig>({
    jobTitle: '',
    industry: 'Software Engineering',
    difficulty: 'mid',
    questionTypes: ['behavioral', 'technical'],
    questionCount: 5,
    duration: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }

    if (config.questionTypes.length === 0) {
      newErrors.questionTypes = 'Select at least one question type';
    }

    if (config.questionCount < 1 || config.questionCount > 20) {
      newErrors.questionCount = 'Question count must be between 1 and 20';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateConfig()) {
      onStartPractice(config);
    }
  };

  const handleQuestionTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setConfig(prev => ({
        ...prev,
        questionTypes: [...prev.questionTypes, typeId],
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        questionTypes: prev.questionTypes.filter(t => t !== typeId),
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Interview Setup</h2>
        <p className="text-gray-600">
          Configure your practice session to match your target role and interview style.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Title */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            id="jobTitle"
            value={config.jobTitle}
            onChange={(e) => setConfig(prev => ({ ...prev, jobTitle: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.jobTitle ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Senior Software Engineer, Product Manager"
          />
          {errors.jobTitle && (
            <p className="mt-1 text-sm text-red-600">{errors.jobTitle}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
            Industry
          </label>
          <select
            id="industry"
            value={config.industry}
            onChange={(e) => setConfig(prev => ({ ...prev, industry: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INDUSTRIES.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience Level
          </label>
          <div className="flex space-x-4">
            {[
              { value: 'junior', label: 'Junior (0-2 years)' },
              { value: 'mid', label: 'Mid-level (2-5 years)' },
              { value: 'senior', label: 'Senior (5+ years)' },
            ].map(level => (
              <label key={level.value} className="flex items-center">
                <input
                  type="radio"
                  name="difficulty"
                  value={level.value}
                  checked={config.difficulty === level.value}
                  onChange={(e) => setConfig(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Types *
          </label>
          <div className="space-y-3">
            {QUESTION_TYPES.map(type => (
              <label key={type.id} className="flex items-start">
                <input
                  type="checkbox"
                  checked={config.questionTypes.includes(type.id)}
                  onChange={(e) => handleQuestionTypeChange(type.id, e.target.checked)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.questionTypes && (
            <p className="mt-1 text-sm text-red-600">{errors.questionTypes}</p>
          )}
        </div>

        {/* Question Count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              id="questionCount"
              min="1"
              max="20"
              value={config.questionCount}
              onChange={(e) => setConfig(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.questionCount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.questionCount && (
              <p className="mt-1 text-sm text-red-600">{errors.questionCount}</p>
            )}
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Session Duration (minutes)
            </label>
            <input
              type="number"
              id="duration"
              min="5"
              max="120"
              value={config.duration}
              onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium"
          >
            {isLoading ? 'Creating Session...' : 'Start Practice Session'}
          </Button>
        </div>
      </form>
    </div>
  );
}