'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface PracticeQuestionProps {
  question: {
    id: string;
    question: string;
    type: string;
    category: string;
    difficulty: string;
    expectedStructure?: string;
    keyPoints?: string[];
    timeLimit?: number;
  };
  onSubmitResponse: (response: string, duration: number) => void;
  isLoading?: boolean;
}

export default function PracticeQuestion({ 
  question, 
  onSubmitResponse, 
  isLoading = false 
}: PracticeQuestionProps) {
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setStartTime(Date.now());
    setTimeElapsed(0);
    setResponse('');
  }, [question.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleSubmit = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onSubmitResponse(response, duration);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (!question.timeLimit) return 'text-gray-600';
    
    const percentage = (timeElapsed / question.timeLimit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getQuestionTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'behavioral': return 'bg-green-100 text-green-800';
      case 'situational': return 'bg-purple-100 text-purple-800';
      case 'cultural': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQuestionTypeColor(question.type)}`}>
              {question.type}
            </span>
            <span className="text-sm text-gray-600">{question.category}</span>
            <span className="text-sm text-gray-600">•</span>
            <span className="text-sm text-gray-600 capitalize">{question.difficulty}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-lg font-mono ${getTimeColor()}`}>
              {formatTime(timeElapsed)}
            </div>
            {question.timeLimit && (
              <div className="text-sm text-gray-500">
                / {formatTime(question.timeLimit)}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {question.question}
        </h2>

        {/* Question Guidelines */}
        {(question.expectedStructure || question.keyPoints) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Guidelines:</h3>
            
            {question.expectedStructure && (
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-800">Structure: </span>
                <span className="text-sm text-blue-700">{question.expectedStructure}</span>
              </div>
            )}
            
            {question.keyPoints && question.keyPoints.length > 0 && (
              <div>
                <span className="text-sm font-medium text-blue-800">Key Points to Cover:</span>
                <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                  {question.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Area */}
      <div className="mb-6">
        <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
          Your Response
        </label>
        <textarea
          id="response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response here... Aim for a clear, structured answer that addresses all aspects of the question."
          className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        
        <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
          <span>{response.length} characters</span>
          <span>~{Math.ceil(response.split(' ').length / 150)} min speaking time</span>
        </div>
      </div>

      {/* Audio Recording Option */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Practice Speaking</h3>
            <p className="text-sm text-gray-600">
              Record yourself speaking to practice delivery and timing
            </p>
          </div>
          <Button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {question.type === 'behavioral' && (
            <span>💡 Tip: Use the STAR method (Situation, Task, Action, Result)</span>
          )}
          {question.type === 'technical' && (
            <span>💡 Tip: Explain your reasoning and provide specific examples</span>
          )}
          {question.type === 'situational' && (
            <span>💡 Tip: Walk through your problem-solving approach step by step</span>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={() => setResponse('')}
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md"
          >
            Clear
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!response.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Submit Response'}
          </Button>
        </div>
      </div>
    </div>
  );
}