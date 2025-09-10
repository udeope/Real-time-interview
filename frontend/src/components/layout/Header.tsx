'use client';

import { useState } from 'react';
import { Menu, X, User, Settings, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProcessingStatus } from '@/types/ui.types';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
  processingStatus: ProcessingStatus;
  onMenuToggle: () => void;
  onLogout: () => void;
}

export function Header({ user, processingStatus, onMenuToggle, onLogout }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getStatusIndicator = () => {
    if (processingStatus.isGeneratingResponse) {
      return (
        <div className="flex items-center space-x-2 text-purple-600">
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Generating Response</span>
        </div>
      );
    }
    
    if (processingStatus.isTranscribing) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Transcribing</span>
        </div>
      );
    }
    
    if (processingStatus.isListening) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Listening</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm font-medium">Ready</span>
      </div>
    );
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900">
                AI Interview Assistant
              </h1>
              {getStatusIndicator()}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block">{user.name}</span>
                </Button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray-500">{user.email}</div>
                    </div>
                    
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </button>
                    
                    <button 
                      onClick={onLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}