import { Module, Global } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { UserMessagesService } from './user-messages.service';
import { ErrorHandlingController } from './error-handling.controller';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RetryService } from '../retry/retry.service';
import { HealthMonitoringService } from '../monitoring/health-monitoring.service';

@Global()
@Module({
  controllers: [ErrorHandlingController],
  providers: [
    ErrorHandlerService,
    UserMessagesService,
    CircuitBreakerService,
    RetryService,
    HealthMonitoringService,
  ],
  exports: [
    ErrorHandlerService,
    UserMessagesService,
    CircuitBreakerService,
    RetryService,
    HealthMonitoringService,
  ],
})
export class ErrorHandlingModule {}