'use client';

import { useAuth } from '@/hooks/useAuth';
import { User, Shield, ShieldCheck } from 'lucide-react';

export function AuthStatus() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Shield className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Checking authentication...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-red-500">
        <Shield className="h-4 w-4" />
        <span className="text-sm">Not authenticated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <ShieldCheck className="h-4 w-4" />
      <div className="flex items-center space-x-1">
        <User className="h-3 w-3" />
        <span className="text-sm">{user?.name}</span>
      </div>
    </div>
  );
}