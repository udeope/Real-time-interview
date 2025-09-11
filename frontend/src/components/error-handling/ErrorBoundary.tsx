'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { ErrorType } from '../../types/error.types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorType?: ErrorType;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Determine error type based on error message or properties
    let errorType: ErrorType = 'SERVICE_UNAVAILABLE';
    
    if (error.message.includes('microphone') || error.message.includes('audio')) {
      errorType = 'AUDIO_PERMISSION_DENIED';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'NETWORK_TIMEOUT';
    } else if (error.message.includes('websocket') || error.message.includes('socket')) {
      errorType = 'WEBSOCKET_CONNECTION_FAILED';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log error to monitoring service
    this.logError(error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // In a real app, this would send to a logging service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    console.error('Error logged:', errorData);
    
    // Send to monitoring service (e.g., Sentry, LogRocket, etc.)
    // monitoringService.logError(errorData);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorType: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          errorType={this.state.errorType || 'SERVICE_UNAVAILABLE'}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}