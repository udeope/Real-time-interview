'use client';

import { useContext } from 'react';
import { AuthContext } from '@/lib/auth.context';
import { AuthContextType } from '@/types/auth.types';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Additional auth-related hooks

export function useRequireAuth() {
  const auth = useAuth();
  
  if (!auth.isAuthenticated && !auth.isLoading) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

export function useOptionalAuth() {
  const auth = useAuth();
  return auth;
}