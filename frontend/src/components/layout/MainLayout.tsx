'use client';

import { useState, ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProcessingStatus } from '@/types/ui.types';

interface MainLayoutProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
  };
  processingStatus?: ProcessingStatus;
  onLogout?: () => void;
}

export function MainLayout({ 
  children, 
  user, 
  processingStatus = {
    isListening: false,
    isTranscribing: false,
    isGeneratingResponse: false,
    lastUpdate: new Date()
  },
  onLogout = () => {}
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        processingStatus={processingStatus}
        onMenuToggle={() => setSidebarOpen(true)}
        onLogout={onLogout}
      />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 lg:ml-64">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}