'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TranscriptionPanel } from '@/components/transcription/TranscriptionPanel';
import { ResponseSuggestionsPanel } from '@/components/responses/ResponseSuggestionsPanel';
import { ContextPanel } from '@/components/context/ContextPanel';
import { AudioCapturePanel } from '@/components/AudioCapturePanel';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TranscriptionData, 
  ResponseOption, 
  JobContext, 
  UserProfile, 
  ProcessingStatus 
} from '@/types/ui.types';
import { Play, Square, Pause } from 'lucide-react';

// Mock data - replace with actual API calls
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

const mockJobContext: JobContext = {
  title: 'Senior Frontend Developer',
  company: 'TechCorp Inc.',
  description: 'We are looking for an experienced frontend developer to join our team and help build the next generation of web applications.',
  requirements: [
    'React.js and TypeScript experience',
    'State management (Redux, Zustand)',
    'Modern CSS frameworks',
    'Testing frameworks (Jest, Cypress)',
    'API integration experience'
  ],
  companyValues: ['Innovation', 'Collaboration', 'Quality', 'Growth'],
  interviewType: 'technical',
  seniority: 'Senior'
};

const mockUserProfile: UserProfile = {
  userId: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  seniority: 'mid',
  industries: ['Technology', 'SaaS', 'E-commerce'],
  experience: [
    {
      company: 'Previous Corp',
      role: 'Frontend Developer',
      duration: '2022-2024',
      achievements: ['Led UI redesign project', 'Improved performance by 40%'],
      technologies: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS']
    }
  ],
  skills: [
    { name: 'React.js', level: 'advanced', category: 'Frontend' },
    { name: 'TypeScript', level: 'intermediate', category: 'Language' },
    { name: 'Node.js', level: 'intermediate', category: 'Backend' }
  ]
};

export default function InterviewPage() {
  const [sessionActive, setSessionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [responses, setResponses] = useState<ResponseOption[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isListening: false,
    isTranscribing: false,
    isGeneratingResponse: false,
    lastUpdate: new Date()
  });

  // Mock transcription data for demonstration
  useEffect(() => {
    if (sessionActive) {
      const mockTranscription: TranscriptionData = {
        id: Date.now().toString(),
        text: "Tell me about your experience with React and how you've used it in previous projects.",
        confidence: 0.95,
        isFinal: true,
        timestamp: Date.now(),
        speakerId: 'interviewer'
      };

      const mockResponses: ResponseOption[] = [
        {
          id: '1',
          content: "I have over 3 years of experience with React, where I've built several production applications. In my previous role at Previous Corp, I led the frontend development of a customer dashboard that served over 10,000 users. I implemented complex state management using Redux, created reusable component libraries, and optimized performance through code splitting and lazy loading, which improved our initial load time by 40%.",
          structure: 'STAR',
          estimatedDuration: 75,
          confidence: 0.92,
          tags: ['React', 'Performance', 'Leadership']
        },
        {
          id: '2',
          content: "I've been working with React for 3+ years, focusing on building scalable web applications. My experience includes component architecture, state management with Redux and Context API, and performance optimization. I'm particularly experienced with React hooks, testing with Jest and React Testing Library, and integrating with REST APIs.",
          structure: 'technical',
          estimatedDuration: 60,
          confidence: 0.88,
          tags: ['React', 'Testing', 'APIs']
        }
      ];

      // Simulate adding transcription after a delay
      setTimeout(() => {
        setTranscriptions([mockTranscription]);
        setProcessingStatus(prev => ({ ...prev, isTranscribing: false, isGeneratingResponse: true }));
        
        // Simulate response generation
        setTimeout(() => {
          setResponses(mockResponses);
          setProcessingStatus(prev => ({ ...prev, isGeneratingResponse: false }));
        }, 2000);
      }, 1000);
    }
  }, [sessionActive]);

  const handleStartSession = () => {
    setSessionActive(true);
    setProcessingStatus(prev => ({ 
      ...prev, 
      isListening: true, 
      isTranscribing: true,
      lastUpdate: new Date() 
    }));
  };

  const handleStopSession = () => {
    setSessionActive(false);
    setProcessingStatus({
      isListening: false,
      isTranscribing: false,
      isGeneratingResponse: false,
      lastUpdate: new Date()
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handleCopyResponse = (response: ResponseOption) => {
    console.log('Copied response:', response.id);
  };

  const handleEditResponse = (response: ResponseOption) => {
    console.log('Edit response:', response.id);
  };

  const handleSelectResponse = (response: ResponseOption) => {
    console.log('Selected response:', response.id);
  };

  return (
    <MainLayout
      user={mockUser}
      processingStatus={processingStatus}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Session Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Interview Session</span>
              <div className="flex items-center space-x-2">
                {!sessionActive ? (
                  <Button onClick={handleStartSession} className="flex items-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span>Start Session</span>
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopSession} 
                    variant="destructive"
                    className="flex items-center space-x-2"
                  >
                    <Square className="h-4 w-4" />
                    <span>Stop Session</span>
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AudioCapturePanel />
          </CardContent>
        </Card>

        {/* Main Interview Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transcription */}
          <div className="lg:col-span-1">
            <TranscriptionPanel
              transcriptions={transcriptions}
              isActive={sessionActive}
              className="h-[600px]"
            />
          </div>

          {/* Middle Column - Response Suggestions */}
          <div className="lg:col-span-1">
            <ResponseSuggestionsPanel
              responses={responses}
              isGenerating={processingStatus.isGeneratingResponse}
              onCopyResponse={handleCopyResponse}
              onEditResponse={handleEditResponse}
              onSelectResponse={handleSelectResponse}
              className="h-[600px]"
            />
          </div>

          {/* Right Column - Context */}
          <div className="lg:col-span-1">
            <ContextPanel
              jobContext={mockJobContext}
              userProfile={mockUserProfile}
              className="h-[600px] overflow-y-auto"
            />
          </div>
        </div>

        {/* Session Info */}
        {sessionActive && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Session Duration: 00:05:23</span>
                <span>Questions Answered: 1</span>
                <span>Avg Response Time: 2.3s</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}