import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { UserMessagesService } from './user-messages.service';
import { HealthMonitoringService } from '../monitoring/health-monitoring.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { ErrorType } from './error-types';

interface ErrorReportDto {
  type: string;
  message: string;
  stack?: string;
  context?: {
    userId?: string;
    sessionId?: string;
    service: string;
    operation: string;
    metadata?: Record<string, any>;
  };
  userAgent?: string;
  url?: string;
  timestamp: string;
}

@Controller('api/errors')
export class ErrorHandlingController {
  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly userMessages: UserMessagesService,
    private readonly healthMonitoring: HealthMonitoringService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async reportError(@Body() errorReport: ErrorReportDto) {
    try {
      // Log the client-side error
      console.error('Client error reported:', {
        type: errorReport.type,
        message: errorReport.message,
        context: errorReport.context,
        userAgent: errorReport.userAgent,
        url: errorReport.url,
        timestamp: errorReport.timestamp,
      });

      // Record error for monitoring if it has a valid context
      if (errorReport.context) {
        const appError = this.errorHandler.createError(
          errorReport.type as ErrorType,
          'medium', // Default severity for client errors
          {
            ...errorReport.context,
            timestamp: new Date(errorReport.timestamp),
          },
          errorReport.message,
        );

        await this.healthMonitoring.recordError(appError);
      }

      return { status: 'received' };
    } catch (error) {
      console.error('Failed to process error report:', error);
      return { status: 'error', message: 'Failed to process error report' };
    }
  }

  @Get('user-message/:errorType')
  getUserMessage(@Param('errorType') errorType: string) {
    try {
      const userMessage = this.userMessages.getUserMessage(errorType as ErrorType);
      return userMessage;
    } catch (error) {
      return this.userMessages.getUserMessage('SERVICE_UNAVAILABLE' as ErrorType);
    }
  }

  @Get('health')
  async getSystemHealth() {
    return await this.healthMonitoring.getSystemHealth();
  }

  @Get('health/:service')
  async getServiceHealth(@Param('service') service: string) {
    return await this.healthMonitoring.getServiceHealth(service);
  }

  @Get('circuits')
  getCircuitBreakerStats() {
    const stats = this.circuitBreaker.getAllCircuitStats();
    const result: Record<string, any> = {};
    
    for (const [name, stat] of stats) {
      result[name] = stat;
    }
    
    return result;
  }

  @Post('circuits/:name/reset')
  @HttpCode(HttpStatus.OK)
  resetCircuit(@Param('name') name: string) {
    try {
      this.circuitBreaker.resetCircuit(name);
      return { status: 'reset', circuit: name };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}