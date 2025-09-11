import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlerService } from './error-handler.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RetryService } from '../retry/retry.service';
import { HealthMonitoringService } from '../monitoring/health-monitoring.service';
import { ErrorType, ErrorSeverity } from './error-types';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let circuitBreaker: CircuitBreakerService;
  let retryService: RetryService;
  let healthMonitoring: HealthMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorHandlerService,
        CircuitBreakerService,
        RetryService,
        HealthMonitoringService,
      ],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
    circuitBreaker = module.get<CircuitBreakerService>(CircuitBreakerService);
    retryService = module.get<RetryService>(RetryService);
    healthMonitoring = module.get<HealthMonitoringService>(HealthMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleError', () => {
    it('should handle audio permission denied error', async () => {
      const error = service.createError(
        ErrorType.AUDIO_PERMISSION_DENIED,
        ErrorSeverity.HIGH,
        {
          service: 'audio',
          operation: 'requestPermission',
          timestamp: new Date(),
        },
        'Microphone permission denied',
      );

      const recoveryAction = await service.handleError(error);

      expect(recoveryAction.type).toBe('manual');
      expect(recoveryAction.automated).toBe(false);
      expect(recoveryAction.userMessage).toContain('microphone');
    });

    it('should handle transcription API timeout with fallback', async () => {
      const error = service.createError(
        ErrorType.TRANSCRIPTION_API_TIMEOUT,
        ErrorSeverity.MEDIUM,
        {
          service: 'transcription',
          operation: 'transcribe',
          timestamp: new Date(),
        },
        'Transcription API timeout',
      );

      const recoveryAction = await service.handleError(error);

      expect(recoveryAction.type).toBe('fallback');
      expect(recoveryAction.automated).toBe(true);
    });

    it('should handle LLM API failure with fallback', async () => {
      const error = service.createError(
        ErrorType.LLM_API_FAILURE,
        ErrorSeverity.HIGH,
        {
          service: 'response-generation',
          operation: 'generateResponse',
          timestamp: new Date(),
        },
        'LLM API failure',
      );

      const recoveryAction = await service.handleError(error);

      expect(recoveryAction.type).toBe('fallback');
      expect(recoveryAction.automated).toBe(true);
    });

    it('should handle rate limiting with retry', async () => {
      const error = service.createError(
        ErrorType.TRANSCRIPTION_RATE_LIMITED,
        ErrorSeverity.MEDIUM,
        {
          service: 'transcription',
          operation: 'transcribe',
          timestamp: new Date(),
        },
        'Rate limit exceeded',
      );

      const recoveryAction = await service.handleError(error);

      expect(recoveryAction.type).toBe('retry');
      expect(recoveryAction.automated).toBe(true);
    });
  });

  describe('createError', () => {
    it('should create error with proper recovery action', () => {
      const error = service.createError(
        ErrorType.WEBSOCKET_CONNECTION_FAILED,
        ErrorSeverity.HIGH,
        {
          service: 'websocket',
          operation: 'connect',
          timestamp: new Date(),
        },
        'WebSocket connection failed',
      );

      expect(error.type).toBe(ErrorType.WEBSOCKET_CONNECTION_FAILED);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.recoveryAction.type).toBe('retry');
      expect(error.recoveryAction.automated).toBe(true);
    });
  });
});

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Register circuit first
      service.registerCircuit('test-circuit', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringPeriod: 60000,
        expectedErrorRate: 0.1,
      });
      
      const result = await service.execute('test-circuit', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      const fallback = jest.fn().mockResolvedValue('fallback-result');
      
      // Register circuit with low threshold for testing
      service.registerCircuit('test-circuit-fallback', {
        failureThreshold: 1,
        recoveryTimeout: 1000,
        monitoringPeriod: 60000,
        expectedErrorRate: 0.1,
      });

      // First call should fail and open circuit
      try {
        await service.execute('test-circuit-fallback', operation, fallback);
      } catch (error) {
        // Expected to fail
      }

      // Second call should use fallback
      const result = await service.execute('test-circuit-fallback', operation, fallback);
      
      expect(result).toBe('fallback-result');
      expect(fallback).toHaveBeenCalled();
    });

    it('should track circuit state correctly', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));
      
      service.registerCircuit('test-state-circuit', {
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringPeriod: 60000,
        expectedErrorRate: 0.1,
      });

      // First failure
      try {
        await service.execute('test-state-circuit', operation);
      } catch (error) {
        // Expected
      }

      let stats = service.getCircuitStats('test-state-circuit');
      expect(stats?.failureCount).toBe(1);
      expect(stats?.state).toBe('CLOSED');

      // Second failure should open circuit
      try {
        await service.execute('test-state-circuit', operation);
      } catch (error) {
        // Expected
      }

      stats = service.getCircuitStats('test-state-circuit');
      expect(stats?.failureCount).toBe(2);
      expect(stats?.state).toBe('OPEN');
    });
  });

  describe('resetCircuit', () => {
    it('should reset circuit state', () => {
      service.registerCircuit('reset-test', {
        failureThreshold: 1,
        recoveryTimeout: 1000,
        monitoringPeriod: 60000,
        expectedErrorRate: 0.1,
      });

      service.resetCircuit('reset-test');
      
      const stats = service.getCircuitStats('reset-test');
      expect(stats?.state).toBe('CLOSED');
      expect(stats?.failureCount).toBe(0);
    });
  });
});

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryService],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.executeWithRetry(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');
      
      const result = await service.executeWithRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10, // Short delay for testing
        maxDelay: 100,
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(
        service.executeWithRetry(operation, {
          maxAttempts: 2,
          baseDelay: 10,
          maxDelay: 100,
        })
      ).rejects.toThrow('Persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Non-retryable error'));
      const retryCondition = jest.fn().mockReturnValue(false);
      
      await expect(
        service.executeWithRetry(operation, {
          maxAttempts: 3,
          baseDelay: 10,
          maxDelay: 100,
          retryCondition,
        })
      ).rejects.toThrow('Non-retryable error');
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createRetryCondition', () => {
    it('should create condition that matches error messages', () => {
      const condition = service.createRetryCondition(['timeout', 'network']);
      
      expect(condition(new Error('Request timeout'))).toBe(true);
      expect(condition(new Error('Network error'))).toBe(true);
      expect(condition(new Error('Invalid input'))).toBe(false);
    });
  });

  describe('createHttpRetryCondition', () => {
    it('should retry on retryable HTTP errors', () => {
      const condition = service.createHttpRetryCondition();
      
      // Retryable errors
      expect(condition({ code: 'ECONNRESET' })).toBe(true);
      expect(condition({ code: 'ETIMEDOUT' })).toBe(true);
      expect(condition({ response: { status: 429 } })).toBe(true);
      expect(condition({ response: { status: 502 } })).toBe(true);
      expect(condition({ response: { status: 503 } })).toBe(true);
      
      // Non-retryable errors
      expect(condition({ response: { status: 400 } })).toBe(false);
      expect(condition({ response: { status: 401 } })).toBe(false);
      expect(condition({ response: { status: 404 } })).toBe(false);
    });
  });
});