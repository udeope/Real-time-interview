'use client';

import { useState, useCallback } from 'react';

interface AuthState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export function useAuthState() {
  const [state, setState] = useState<AuthState>({
    isLoading: false,
    error: null,
    success: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, success: null }));
  }, []);

  const setSuccess = useCallback((success: string | null) => {
    setState(prev => ({ ...prev, success, error: null }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, success: null });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    clearMessages,
    reset,
  };
}