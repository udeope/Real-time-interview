import { ErrorType, AppError, ErrorSeverity } from '../types/error.types';

export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorListeners: ((error: AppError) => void)[] = [];

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  handleError(error: Error | AppError, context?: Partial<AppError>): AppError {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error;
    } else {
      // Convert regular Error to AppError
      const errorType = this.determineErrorType(error);
      appError = {
        type: errorType,
        severity: this.determineSeverity(errorType),
        context: {
          service: context?.context?.service || 'unknown',
          operation: context?.context?.operation || 'unknown',
          timestamp: new Date(),
          ...context?.context,
        },
        recoveryAction: {
          type: 'retry',
          description: 'Retry the operation',
          automated: false,
        },
        message: error.message,
        originalError: error,
      };
    }

    // Log error
    this.logError(appError);

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(appError);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    return appError;
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'severity' in error;
  }

  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    // Audio errors
    if (message.includes('permission') && message.includes('microphone')) {
      return 'AUDIO_PERMISSION_DENIED';
    }
    if (message.includes('audio') && message.includes('device')) {
      return 'AUDIO_DEVICE_NOT_FOUND';
    }
    if (message.includes('audio') && message.includes('stream')) {
      return 'AUDIO_STREAM_INTERRUPTED';
    }
    
    // Network errors
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'NETWORK_TIMEOUT';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_UNREACHABLE';
    }
    
    // WebSocket errors
    if (message.includes('websocket') || message.includes('socket')) {
      return 'WEBSOCKET_CONNECTION_FAILED';
    }
    
    // Transcription errors
    if (message.includes('transcription') || message.includes('speech')) {
      return 'TRANSCRIPTION_API_FAILURE';
    }
    
    // LLM errors
    if (message.includes('openai') || message.includes('gpt') || message.includes('claude')) {
      return 'LLM_API_FAILURE';
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return 'API_QUOTA_EXCEEDED';
    }
    
    return 'SERVICE_UNAVAILABLE';
  }

  private determineSeverity(errorType: ErrorType): ErrorSeverity {
    switch (errorType) {
      case 'AUDIO_PERMISSION_DENIED':
      case 'AUDIO_DEVICE_NOT_FOUND':
      case 'SERVICE_UNAVAILABLE':
      case 'DATABASE_CONNECTION_FAILED':
        return 'critical';
      
      case 'TRANSCRIPTION_API_FAILURE':
      case 'LLM_API_FAILURE':
      case 'WEBSOCKET_CONNECTION_FAILED':
      case 'NETWORK_UNREACHABLE':
        return 'high';
      
      case 'AUDIO_STREAM_INTERRUPTED':
      case 'TRANSCRIPTION_API_TIMEOUT':
      case 'TRANSCRIPTION_LOW_CONFIDENCE':
      case 'LLM_RATE_LIMITED':
      case 'NETWORK_TIMEOUT':
        return 'medium';
      
      default:
        return 'low';
    }
  }

  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.originalError?.stack,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logData);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(logData);
    }
  }

  private async sendToMonitoring(errorData: any): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring:', monitoringError);
    }
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw this.handleError(lastError!, {
      context: {
        service: 'retry',
        operation: 'retryOperation',
        timestamp: new Date(),
        metadata: { attempts: maxAttempts },
      },
    });
  }

  createErrorFromResponse(response: Response): AppError {
    let errorType: ErrorType = 'SERVICE_UNAVAILABLE';
    
    switch (response.status) {
      case 408:
        errorType = 'NETWORK_TIMEOUT';
        break;
      case 429:
        errorType = 'API_QUOTA_EXCEEDED';
        break;
      case 502:
      case 503:
      case 504:
        errorType = 'SERVICE_UNAVAILABLE';
        break;
      default:
        errorType = 'SERVICE_UNAVAILABLE';
    }
    
    return {
      type: errorType,
      severity: this.determineSeverity(errorType),
      context: {
        service: 'http',
        operation: 'fetch',
        timestamp: new Date(),
        metadata: {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
      },
      recoveryAction: {
        type: 'retry',
        description: 'Retry the request',
        automated: false,
      },
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  async handleAsyncError<T>(
    promise: Promise<T>,
    context?: Partial<AppError>,
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw this.handleError(error as Error, context);
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlerService.getInstance();