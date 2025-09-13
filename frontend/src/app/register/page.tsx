'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { AuthLoading } from '@/components/auth/AuthLoading';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleRegister = async (data: { name: string; email: string; password: string }) => {
    setError(null);

    try {
      await register(data);
      // Redirect will happen automatically via useEffect
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  // Show loading while checking authentication status
  if (authLoading) {
    return <AuthLoading message="Checking authentication..." />;
  }

  // Don't render register form if already authenticated
  if (isAuthenticated) {
    return <AuthLoading message="Redirecting to dashboard..." />;
  }

  return (
    <RegisterForm
      onSubmit={handleRegister}
      isLoading={authLoading}
      error={error || undefined}
    />
  );
}