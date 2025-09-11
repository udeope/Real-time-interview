import { Injectable, Logger } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export interface RetryStats {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  totalDelay: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
  ): Promise<T> {
    const {
      maxAttempts,
      baseDelay,
      maxDelay,
      backoffMultiplier = 2,
      jitter = true,
      retryCondition = () => true,
    } = config;

    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(`Operation succeeded on attempt ${attempt}/${maxAttempts}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        this.logger.warn(
          `Operation failed on attempt ${attempt}/${maxAttempts}: ${error.message}`,
        );

        // Check if we should retry this error
        if (!retryCondition(error)) {
          this.logger.warn('Error does not meet retry condition, not retrying');
          throw error;
        }

        // Don't delay after the last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, baseDelay, maxDelay, backoffMultiplier, jitter);
        totalDelay += delay;

        this.logger.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }

    this.logger.error(
      `Operation failed after ${maxAttempts} attempts (total delay: ${totalDelay}ms)`,
      lastError,
    );
    
    throw lastError;
  }

  async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      baseDelay,
      maxDelay: 30000, // 30 seconds max
      backoffMultiplier: 2,
      jitter: true,
    });
  }

  async executeWithLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      baseDelay: delay,
      maxDelay: delay,
      backoffMultiplier: 1,
      jitter: false,
    });
  }

  createRetryCondition(retryableErrors: string[]): (error: any) => boolean {
    return (error: any) => {
      if (!error) return false;
      
      // Check error message
      if (typeof error.message === 'string') {
        return retryableErrors.some(retryableError => 
          error.message.toLowerCase().includes(retryableError.toLowerCase())
        );
      }
      
      // Check error code
      if (error.code) {
        return retryableErrors.includes(error.code);
      }
      
      // Check error type
      if (error.type) {
        return retryableErrors.includes(error.type);
      }
      
      return false;
    };
  }

  createHttpRetryCondition(): (error: any) => boolean {
    return (error: any) => {
      // Retry on network errors
      if (error.code === 'ECONNRESET' || 
          error.code === 'ENOTFOUND' || 
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT') {
        return true;
      }

      // Retry on specific HTTP status codes
      if (error.response?.status) {
        const status = error.response.status;
        return status === 408 || // Request Timeout
               status === 429 || // Too Many Requests
               status === 502 || // Bad Gateway
               status === 503 || // Service Unavailable
               status === 504;   // Gateway Timeout
      }

      return false;
    };
  }

  private calculateDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    backoffMultiplier: number,
    jitter: boolean,
  ): number {
    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, maxDelay);
    
    // Add jitter to prevent thundering herd
    if (jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method for creating common retry configurations
  static createConfig(type: 'fast' | 'standard' | 'slow' | 'persistent'): RetryConfig {
    switch (type) {
      case 'fast':
        return {
          maxAttempts: 3,
          baseDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 1.5,
          jitter: true,
        };
      
      case 'standard':
        return {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
        };
      
      case 'slow':
        return {
          maxAttempts: 5,
          baseDelay: 2000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitter: true,
        };
      
      case 'persistent':
        return {
          maxAttempts: 10,
          baseDelay: 1000,
          maxDelay: 60000,
          backoffMultiplier: 1.5,
          jitter: true,
        };
      
      default:
        return RetryService.createConfig('standard');
    }
  }
}