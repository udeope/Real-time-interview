import { Injectable, Logger } from '@nestjs/common';
import { AppError, ErrorType, ErrorSeverity, ErrorContext, RecoveryAction } from './error-types';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RetryService } from '../retry/retry.service';
import { HealthMonitoringService } from '../monitoring/health-monitoring.service';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly healthMonitoring: HealthMonitoringService,
  ) {}

  async handleError(error: AppError): Promise<RecoveryAction> {
    this.logger.error(
      `Error occurred: ${error.type}`,
      {
        severity: error.severity,
        context: error.context,
        originalError: error.originalError?.message,
      },
    );

    // Record error for monitoring
    await this.healthMonitoring.recordError(error);

    // Determine recovery action based on error type
    const recoveryAction = this.determineRecoveryAction(error);

    // Execute automated recovery if possible
    if (recoveryAction.automated) {
      await this.executeRecovery(error, recoveryAction);
    }

    return recoveryAction;
  }

  private determineRecoveryAction(error: AppError): RecoveryAction {
    switch (error.type) {
      case ErrorType.AUDIO_PERMISSION_DENIED:
        return {
          type: 'manual',
          description: 'User needs to grant microphone permissions',
          automated: false,
          userMessage: 'Please allow microphone access to continue',
          instructions: [
            'Click the microphone icon in your browser address bar',
            'Select "Allow" for microphone access',
            'Refresh the page if needed',
          ],
        };

      case ErrorType.AUDIO_DEVICE_NOT_FOUND:
        return {
          type: 'fallback',
          description: 'Switch to available audio device',
          automated: true,
          userMessage: 'Switching to available audio device...',
        };

      case ErrorType.TRANSCRIPTION_API_TIMEOUT:
      case ErrorType.TRANSCRIPTION_API_FAILURE:
        return {
          type: 'fallback',
          description: 'Switch to backup transcription service',
          automated: true,
          userMessage: 'Switching to backup transcription service...',
        };

      case ErrorType.LLM_API_FAILURE:
        return {
          type: 'fallback',
          description: 'Switch to backup LLM provider',
          automated: true,
          userMessage: 'Switching to backup AI service...',
        };

      case ErrorType.TRANSCRIPTION_RATE_LIMITED:
      case ErrorType.LLM_RATE_LIMITED:
        return {
          type: 'retry',
          description: 'Retry with exponential backoff',
          automated: true,
          userMessage: 'Service temporarily busy, retrying...',
        };

      case ErrorType.DATABASE_CONNECTION_FAILED:
        return {
          type: 'retry',
          description: 'Retry database connection',
          automated: true,
          userMessage: 'Reconnecting to database...',
        };

      case ErrorType.WEBSOCKET_CONNECTION_FAILED:
        return {
          type: 'retry',
          description: 'Retry WebSocket connection',
          automated: true,
          userMessage: 'Reconnecting...',
        };

      default:
        return {
          type: 'manual',
          description: 'Manual intervention required',
          automated: false,
          userMessage: 'An unexpected error occurred. Please try again.',
        };
    }
  }

  private async executeRecovery(error: AppError, action: RecoveryAction): Promise<void> {
    try {
      switch (action.type) {
        case 'retry':
          await this.retryService.executeWithRetry(
            () => this.retryOperation(error),
            {
              maxAttempts: 3,
              baseDelay: 1000,
              maxDelay: 10000,
            },
          );
          break;

        case 'fallback':
          await this.executeFallback(error);
          break;

        default:
          // No automated recovery for manual actions
          break;
      }
    } catch (recoveryError) {
      this.logger.error('Recovery action failed', recoveryError);
      throw new AppError(
        ErrorType.SERVICE_UNAVAILABLE,
        ErrorSeverity.CRITICAL,
        error.context,
        {
          type: 'manual',
          description: 'Recovery failed, manual intervention required',
          automated: false,
          userMessage: 'Service temporarily unavailable. Please try again later.',
        },
        'Recovery action failed',
        recoveryError,
      );
    }
  }

  private async retryOperation(error: AppError): Promise<void> {
    // This would be implemented based on the specific operation that failed
    // For now, we'll just log the retry attempt
    this.logger.log(`Retrying operation for error: ${error.type}`);
  }

  private async executeFallback(error: AppError): Promise<void> {
    switch (error.type) {
      case ErrorType.TRANSCRIPTION_API_TIMEOUT:
      case ErrorType.TRANSCRIPTION_API_FAILURE:
        // Switch transcription provider
        await this.switchTranscriptionProvider(error.context);
        break;

      case ErrorType.LLM_API_FAILURE:
        // Switch LLM provider
        await this.switchLLMProvider(error.context);
        break;

      case ErrorType.AUDIO_DEVICE_NOT_FOUND:
        // Switch to default audio device
        await this.switchAudioDevice(error.context);
        break;

      default:
        this.logger.warn(`No fallback implemented for error type: ${error.type}`);
    }
  }

  private async switchTranscriptionProvider(context: ErrorContext): Promise<void> {
    this.logger.log('Switching transcription provider', context);
    // Implementation would notify the transcription service to switch providers
  }

  private async switchLLMProvider(context: ErrorContext): Promise<void> {
    this.logger.log('Switching LLM provider', context);
    // Implementation would notify the response generation service to switch providers
  }

  private async switchAudioDevice(context: ErrorContext): Promise<void> {
    this.logger.log('Switching audio device', context);
    // Implementation would notify the audio service to switch devices
  }

  createError(
    type: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext,
    message?: string,
    originalError?: Error,
  ): AppError {
    const recoveryAction = this.determineRecoveryAction(
      new AppError(type, severity, context, null, message, originalError),
    );

    return new AppError(type, severity, context, recoveryAction, message, originalError);
  }
}