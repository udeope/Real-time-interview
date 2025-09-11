'use client';

import React, { useState, useEffect } from 'react';
import PracticeSetup from '../../components/practice/PracticeSetup';
import PracticeQuestion from '../../components/practice/PracticeQuestion';
import PracticeFeedback from '../../components/practice/PracticeFeedback';
import PracticeSessionSummary from '../../components/practice/PracticeSessionSummary';
import PracticeHistory from '../../components/practice/PracticeHistory';

type PracticeMode = 'setup' | 'question' | 'feedback' | 'summary' | 'history';

interface PracticeSession {
  id: string;
  questions: any[];
  currentQuestionIndex: number;
  responses: any[];
}

interface PracticeConfig {
  jobTitle: string;
  industry: string;
  difficulty: 'junior' | 'mid' | 'senior';
  questionTypes: string[];
  questionCount: number;
  duration?: number;
}

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('setup');
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [lastFeedback, setLastFeedback] = useState<any>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [practiceHistory, setPracticeHistory] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load practice history on component mount
  useEffect(() => {
    loadPracticeHistory();
    loadUserStats();
  }, []);

  const loadPracticeHistory = async () => {
    try {
      // This would be an API call to fetch user's practice history
      // For now, using mock data
      const mockHistory = [
        {
          id: '1',
          jobTitle: 'Software Engineer',
          industry: 'Software Engineering',
          questionsAnswered: 5,
          averageScore: 7.8,
          duration: 25,
          completedAt: new Date(Date.now() - 86400000), // Yesterday
          achievements: ['Completed first session', 'Strong technical answers'],
          improvementAreas: ['Response structure', 'Time management'],
        },
        {
          id: '2',
          jobTitle: 'Product Manager',
          industry: 'Product Management',
          questionsAnswered: 3,
          averageScore: 6.5,
          duration: 18,
          completedAt: new Date(Date.now() - 172800000), // 2 days ago
          achievements: ['Good behavioral responses'],
          improvementAreas: ['Strategic thinking', 'Metrics knowledge'],
        },
      ];
      setPracticeHistory(mockHistory);
    } catch (error) {
      console.error('Error loading practice history:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // This would be an API call to fetch user's overall stats
      // For now, using mock data
      const mockStats = {
        totalSessions: 2,
        totalQuestions: 8,
        averageScore: 7.2,
        totalPracticeTime: 43,
        improvementTrend: 'improving',
        strongestSkills: ['Technical Knowledge', 'Problem Solving'],
        areasForImprovement: ['Time Management', 'Response Structure'],
      };
      setUserStats(mockStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleStartPractice = async (config: PracticeConfig) => {
    setIsLoading(true);
    try {
      // This would be an API call to create a practice session
      // For now, creating mock session
      const mockSession = {
        id: `session-${Date.now()}`,
        questions: generateMockQuestions(config),
        currentQuestionIndex: 0,
        responses: [],
      };
      
      setSession(mockSession);
      setCurrentQuestion(mockSession.questions[0]);
      setMode('question');
    } catch (error) {
      console.error('Error starting practice session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockQuestions = (config: PracticeConfig) => {
    const questionTemplates = {
      technical: [
        `How would you optimize a slow database query in a ${config.jobTitle} role?`,
        `Explain the architecture you would design for a scalable ${config.industry.toLowerCase()} application.`,
        `What are the key technical challenges in ${config.industry} and how would you address them?`,
      ],
      behavioral: [
        `Tell me about a time when you had to work under pressure in your ${config.jobTitle} role.`,
        `Describe a situation where you had to learn a new technology quickly.`,
        `Give me an example of when you had to work with a difficult team member.`,
      ],
      situational: [
        `How would you handle a situation where a project deadline is at risk in your role as a ${config.jobTitle}?`,
        `What would you do if you disagreed with your manager's technical approach?`,
        `How would you prioritize multiple urgent tasks as a ${config.jobTitle}?`,
      ],
      cultural: [
        `What motivates you in your work as a ${config.jobTitle}?`,
        `How do you approach teamwork and collaboration in ${config.industry}?`,
        `What are your long-term career goals in ${config.industry}?`,
      ],
    };

    const questions = [];
    for (let i = 0; i < config.questionCount; i++) {
      const type = config.questionTypes[i % config.questionTypes.length];
      const templates = questionTemplates[type as keyof typeof questionTemplates] || questionTemplates.behavioral;
      const questionText = templates[i % templates.length];
      
      questions.push({
        id: `q-${i + 1}`,
        question: questionText,
        type: type,
        category: type === 'technical' ? 'Technical Skills' : type === 'behavioral' ? 'Behavioral' : type === 'situational' ? 'Problem Solving' : 'Cultural Fit',
        difficulty: config.difficulty,
        expectedStructure: type === 'behavioral' ? 'STAR method (Situation, Task, Action, Result)' : type === 'technical' ? 'Technical explanation with examples' : 'Problem analysis and solution approach',
        keyPoints: type === 'behavioral' 
          ? ['Situation description', 'Task/challenge', 'Actions taken', 'Results achieved']
          : type === 'technical'
          ? ['Technical accuracy', 'Best practices', 'Practical examples']
          : ['Problem identification', 'Solution approach', 'Implementation plan'],
        timeLimit: type === 'technical' ? 240 : type === 'behavioral' ? 180 : 200,
      });
    }
    return questions;
  };

  const handleSubmitResponse = async (response: string, duration: number) => {
    if (!session || !currentQuestion) return;

    setIsLoading(true);
    try {
      // This would be an API call to submit response and get feedback
      // For now, generating mock feedback based on question type and response
      const mockFeedback = generateMockFeedback(currentQuestion, response, duration);

      setLastFeedback(mockFeedback);
      
      // Update session with response
      const updatedSession = {
        ...session,
        responses: [...session.responses, { questionId: currentQuestion.id, response, duration, feedback: mockFeedback }],
      };
      setSession(updatedSession);
      setMode('feedback');
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockFeedback = (question: any, response: string, duration: number) => {
    const wordCount = response.split(' ').length;
    const baseScore = 6 + Math.random() * 2; // Base score between 6-8
    
    // Adjust score based on response characteristics
    let contentScore = baseScore;
    let structureScore = baseScore;
    let clarityScore = baseScore;
    
    // Content scoring
    if (wordCount > 100) contentScore += 0.5;
    if (wordCount > 200) contentScore += 0.5;
    if (response.toLowerCase().includes('example')) contentScore += 0.3;
    
    // Structure scoring for behavioral questions
    if (question.type === 'behavioral') {
      const hasSTAR = ['situation', 'task', 'action', 'result'].some(keyword => 
        response.toLowerCase().includes(keyword)
      );
      if (hasSTAR) structureScore += 1;
    }
    
    // Time management
    const timeScore = question.timeLimit ? Math.max(0, 1 - Math.abs(duration - question.timeLimit) / question.timeLimit) : 0.8;
    clarityScore += timeScore * 0.5;
    
    const overallScore = (contentScore + structureScore + clarityScore) / 3;
    
    const strengths = [];
    const improvements = [];
    const suggestions = [];
    
    if (wordCount > 150) strengths.push('Provided detailed response');
    if (duration <= (question.timeLimit || 180)) strengths.push('Good time management');
    if (response.includes('example') || response.includes('experience')) strengths.push('Used specific examples');
    
    if (wordCount < 50) improvements.push('Provide more detailed explanations');
    if (duration > (question.timeLimit || 180) * 1.2) improvements.push('Work on being more concise');
    if (question.type === 'behavioral' && !response.toLowerCase().includes('result')) {
      improvements.push('Include measurable outcomes and results');
    }
    
    suggestions.push('Practice structuring your responses with clear beginning, middle, and end');
    if (question.type === 'behavioral') suggestions.push('Use the STAR method for behavioral questions');
    if (question.type === 'technical') suggestions.push('Include specific technical details and best practices');
    
    return {
      overallScore: Math.min(10, Math.max(1, overallScore)),
      contentScore: Math.min(10, Math.max(1, contentScore)),
      structureScore: Math.min(10, Math.max(1, structureScore)),
      clarityScore: Math.min(10, Math.max(1, clarityScore)),
      feedback: `Your response demonstrates ${overallScore >= 7 ? 'good' : 'basic'} understanding of the question. ${
        wordCount > 100 ? 'You provided sufficient detail' : 'Consider adding more specific examples'
      }. ${duration <= (question.timeLimit || 180) ? 'Your timing was appropriate' : 'Consider being more concise'}.`,
      strengths,
      improvements,
      suggestions,
    };
  };

  const handleContinue = () => {
    if (!session) return;

    const nextIndex = session.currentQuestionIndex + 1;
    
    if (nextIndex < session.questions.length) {
      // Move to next question
      const updatedSession = {
        ...session,
        currentQuestionIndex: nextIndex,
      };
      setSession(updatedSession);
      setCurrentQuestion(session.questions[nextIndex]);
      setMode('question');
    } else {
      // Complete session
      handleCompleteSession();
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      // Calculate session summary
      const averageScore = session.responses.reduce((sum, r) => sum + r.feedback.overallScore, 0) / session.responses.length;
      const totalDuration = session.responses.reduce((sum, r) => sum + r.duration, 0);
      
      const mockSummary = {
        id: session.id,
        jobTitle: 'Software Engineer', // This would come from session config
        industry: 'Software Engineering',
        questionsAnswered: session.responses.length,
        averageScore: averageScore,
        duration: Math.round(totalDuration / 60), // Convert to minutes
        completedAt: new Date(),
        achievements: [
          ...(averageScore >= 8 ? ['Excellent performance'] : []),
          ...(session.responses.length >= 5 ? ['Completed full session'] : []),
          ...(session.responses.some(r => r.feedback.structureScore >= 8) ? ['Strong response structure'] : []),
        ],
        improvementAreas: [
          ...(averageScore < 7 ? ['Overall response quality'] : []),
          ...(session.responses.some(r => r.duration > 200) ? ['Time management'] : []),
          ...(session.responses.some(r => r.feedback.structureScore < 6) ? ['Response structure'] : []),
        ],
      };

      setSessionSummary(mockSummary);
      setMode('summary');
      
      // Refresh history
      await loadPracticeHistory();
      await loadUserStats();
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = () => {
    setMode('history');
  };

  const handleViewSession = (sessionId: string) => {
    // This would navigate to a detailed session view
    console.log('View session:', sessionId);
  };

  const handleStartNewSession = () => {
    setSession(null);
    setCurrentQuestion(null);
    setLastFeedback(null);
    setSessionSummary(null);
    setMode('setup');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {mode === 'setup' && (
        <div className="py-8">
          <PracticeSetup 
            onStartPractice={handleStartPractice}
            isLoading={isLoading}
          />
        </div>
      )}

      {mode === 'question' && currentQuestion && (
        <div className="py-8">
          <PracticeQuestion
            question={currentQuestion}
            onSubmitResponse={handleSubmitResponse}
            isLoading={isLoading}
          />
        </div>
      )}

      {mode === 'feedback' && lastFeedback && (
        <div className="py-8">
          <PracticeFeedback
            feedback={lastFeedback}
            onContinue={handleContinue}
            isLastQuestion={session ? session.currentQuestionIndex >= session.questions.length - 1 : false}
          />
        </div>
      )}

      {mode === 'summary' && sessionSummary && (
        <div className="py-8">
          <PracticeSessionSummary
            summary={sessionSummary}
            onStartNewSession={handleStartNewSession}
            onViewHistory={handleViewHistory}
          />
        </div>
      )}

      {mode === 'history' && (
        <div className="py-8">
          <PracticeHistory
            sessions={practiceHistory}
            userStats={userStats}
            onViewSession={handleViewSession}
            onStartNewSession={handleStartNewSession}
          />
        </div>
      )}
    </div>
  );
}