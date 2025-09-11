'use client';

import React from 'react';
import { Button } from '../ui/Button';

interface PracticeFeedbackProps {
  feedback: {
    overallScore: number;
    contentScore: number;
    structureScore: number;
    clarityScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };
  onContinue: () => void;
  onViewDetails?: () => void;
  isLastQuestion?: boolean;
}

export default function PracticeFeedback({ 
  feedback, 
  onContinue, 
  onViewDetails,
  isLastQuestion = false 
}: PracticeFeedbackProps) {
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

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => (
    <div className="text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${getScoreBackground(score)}`}>
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${getScoreBackground(feedback.overallScore)}`}>
            <span className={`text-3xl font-bold ${getScoreColor(feedback.overallScore)}`}>
              {feedback.overallScore.toFixed(1)}
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Response Analysis</h2>
        <p className="text-gray-600">
          {feedback.overallScore >= 8 && "Excellent response! You demonstrated strong interview skills."}
          {feedback.overallScore >= 6 && feedback.overallScore < 8 && "Good response with room for improvement."}
          {feedback.overallScore < 6 && "Keep practicing! Focus on the areas highlighted below."}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <ScoreCircle score={feedback.contentScore} label="Content" />
        <ScoreCircle score={feedback.structureScore} label="Structure" />
        <ScoreCircle score={feedback.clarityScore} label="Clarity" />
      </div>

      {/* Detailed Feedback */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Detailed Feedback</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">{feedback.feedback}</p>
        </div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
              <span className="mr-2">✅</span>
              Strengths
            </h3>
            <ul className="space-y-2">
              {feedback.strengths.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.improvements.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
              <span className="mr-2">🎯</span>
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {feedback.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-600 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {feedback.suggestions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <span className="mr-2">💡</span>
            Suggestions for Next Time
          </h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <ul className="space-y-2">
              {feedback.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        {onViewDetails && (
          <Button
            onClick={onViewDetails}
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md"
          >
            View Detailed Analysis
          </Button>
        )}
        
        <div className="flex space-x-3 ml-auto">
          <Button
            onClick={onContinue}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            {isLastQuestion ? 'Complete Session' : 'Next Question'}
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
          {isLastQuestion ? (
            <span>🎉 Last question completed!</span>
          ) : (
            <span>📝 Ready for the next question</span>
          )}
        </div>
      </div>
    </div>
  );
}