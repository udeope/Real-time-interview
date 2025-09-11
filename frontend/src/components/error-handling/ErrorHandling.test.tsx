import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorDisplay } from './ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Mock the error handler service
jest.mock('../../lib/error-handler.service', () => ({
  errorHandler: {
    handleError: jest.fn(),
    addErrorListener: jest.fn(() => () => {}),
    handleAsyncError: jest.fn(),
    retryOperation: jest.fn(),
  },
}));

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should catch and display error when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/We're experiencing technical difficulties/)).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error state when retry is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const fallback = <div>Custom error fallback</div>;
    
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });
});

describe('ErrorDisplay', () => {
  it('should display audio permission error correctly', () => {
    render(
      <ErrorDisplay
        errorType="AUDIO_PERMISSION_DENIED"
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Microphone Access Required')).toBeInTheDocument();
    expect(screen.getByText(/We need access to your microphone/)).toBeInTheDocument();
    expect(screen.getByText('Grant Permission')).toBeInTheDocument();
  });

  it('should display network error correctly', () => {
    render(
      <ErrorDisplay
        errorType="NETWORK_TIMEOUT"
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Network Timeout')).toBeInTheDocument();
    expect(screen.getByText(/took too long to complete/)).toBeInTheDocument();
  });

  it('should show instructions when available', () => {
    render(
      <ErrorDisplay
        errorType="AUDIO_DEVICE_NOT_FOUND"
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('What you can do:')).toBeInTheDocument();
    expect(screen.getByText(/Check that your microphone is properly connected/)).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorDisplay
        errorType="WEBSOCKET_CONNECTION_FAILED"
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByText('Reconnect Now');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('should show countdown when estimated recovery time is provided', () => {
    render(
      <ErrorDisplay
        errorType="TRANSCRIPTION_API_TIMEOUT"
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText(/Estimated recovery time:/)).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    render(
      <ErrorDisplay
        errorType="AUDIO_STREAM_INTERRUPTED"
        onRetry={jest.fn()}
        compact={true}
      />
    );

    expect(screen.getByText('Audio Connection Lost')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    // Should not show detailed instructions in compact mode
    expect(screen.queryByText('What you can do:')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    
    render(
      <ErrorDisplay
        errorType="LLM_CONTEXT_MISSING"
        onDismiss={onDismiss}
        compact={true}
      />
    );

    const dismissButton = screen.getByText('×');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error with stack');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    render(
      <ErrorDisplay
        errorType="SERVICE_UNAVAILABLE"
        error={error}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

// Mock component for testing useErrorHandler hook
const TestErrorHandlerComponent: React.FC<{
  shouldThrowError?: boolean;
  autoRetry?: boolean;
}> = ({ shouldThrowError = false, autoRetry = false }) => {
  const { error, isRetrying, handleError, clearError, retry } = useErrorHandler({
    autoRetry,
    maxRetries: 2,
    retryDelay: 10,
  });

  const throwTestError = () => {
    handleError(new Error('Test error'));
  };

  const performAsyncOperation = async () => {
    if (shouldThrowError) {
      throw new Error('Async operation failed');
    }
    return 'success';
  };

  React.useEffect(() => {
    if (shouldThrowError) {
      throwTestError();
    }
  }, [shouldThrowError]);

  return (
    <div>
      {error && <div data-testid="error-message">{error.message}</div>}
      {isRetrying && <div data-testid="retrying">Retrying...</div>}
      <button onClick={throwTestError}>Throw Error</button>
      <button onClick={clearError}>Clear Error</button>
      <button onClick={() => retry(performAsyncOperation)}>Retry Operation</button>
    </div>
  );
};

describe('useErrorHandler', () => {
  it('should handle errors correctly', () => {
    render(<TestErrorHandlerComponent />);

    const throwButton = screen.getByText('Throw Error');
    fireEvent.click(throwButton);

    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('should clear errors correctly', () => {
    render(<TestErrorHandlerComponent />);

    const throwButton = screen.getByText('Throw Error');
    fireEvent.click(throwButton);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();

    const clearButton = screen.getByText('Clear Error');
    fireEvent.click(clearButton);

    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('should handle retry operations', async () => {
    render(<TestErrorHandlerComponent shouldThrowError={false} />);

    const retryButton = screen.getByText('Retry Operation');
    fireEvent.click(retryButton);

    // Should not show error for successful operation
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('should show retrying state during retry', async () => {
    render(<TestErrorHandlerComponent shouldThrowError={true} />);

    const retryButton = screen.getByText('Retry Operation');
    fireEvent.click(retryButton);

    // Should show retrying state briefly
    await waitFor(() => {
      expect(screen.queryByTestId('retrying')).toBeInTheDocument();
    });
  });
});