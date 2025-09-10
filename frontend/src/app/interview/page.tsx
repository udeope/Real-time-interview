'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { InterviewSession } from '@/components/interview/InterviewSession';
import { 
  JobContext, 
  UserProfile, 
  ProcessingStatus 
} from '@/types/ui.types';

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
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isListening: false,
    isTranscribing: false,
    isGeneratingResponse: false,
    lastUpdate: new Date()
  });

  // Get auth token from localStorage or context
  const [authToken, setAuthToken] = useState<string>('');
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    } else {
      // Redirect to login if no token
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handleSessionEnd = () => {
    setProcessingStatus({
      isListening: false,
      isTranscribing: false,
      isGeneratingResponse: false,
      lastUpdate: new Date()
    });
  };

  // Don't render if no auth token
  if (!authToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      user={mockUser}
      processingStatus={processingStatus}
      onLogout={handleLogout}
    >
      <InterviewSession
        sessionId={`session-${Date.now()}`} // Generate or get from URL params
        jobContext={mockJobContext}
        userProfile={mockUserProfile}
        authToken={authToken}
        onSessionEnd={handleSessionEnd}
      />
    </MainLayout>
  );
}