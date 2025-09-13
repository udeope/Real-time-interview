'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContextType, User, LoginDto, RegisterDto } from '@/types/auth.types';
import { authService } from './auth.service';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getToken();
        const storedUser = typeof window !== 'undefined' 
          ? localStorage.getItem('user') 
          : null;

        if (storedToken) {
          setToken(storedToken);
          
          // Try to use stored user data first for faster loading
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch (error) {
              console.error('Failed to parse stored user data:', error);
            }
          }
          
          // Then verify with server
          try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            // Update localStorage with fresh data
            if (typeof window !== 'undefined') {
              localStorage.setItem('user', JSON.stringify(userData));
            }
          } catch (error) {
            console.error('Failed to get current user:', error);
            // Token might be expired, clear it
            authService.logout();
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginDto): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.login(credentials);
      
      setToken(authData.access_token);
      setUser(authData.user);
      
      // Store user data in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterDto): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.register(userData);
      
      setToken(authData.access_token);
      setUser(authData.user);
      
      // Store user data in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    authService.logout();
    setToken(null);
    setUser(null);
    
    // Clear user data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    
    // Redirect to login page
    router.push('/login');
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (!token) {
        throw new Error('No token available');
      }
      
      const userData = await authService.getCurrentUser();
      setUser(userData);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, logout user
      logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}