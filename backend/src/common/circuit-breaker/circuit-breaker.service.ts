import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrorRate: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerStats>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  constructor() {
    // Default configurations for different services
    this.registerCircuit('transcription-google', {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      expectedErrorRate: 0.05, // 5%
    });

    this.registerCircuit('transcription-whisper', {
      failureThreshold: 3,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000,
      expectedErrorRate: 0.02, // 2%
    });

    this.registerCircuit('llm-openai', {
      failureThreshold: 3,
      recoveryTimeout: 45000, // 45 seconds
      monitoringPeriod: 60000,
      expectedErrorRate: 0.03, // 3%
    });

    this.registerCircuit('llm-claude', {
      failureThreshold: 3,
      recoveryTimeout: 45000,
      monitoringPeriod: 60000,
      expectedErrorRate: 0.03,
    });

    this.registerCircuit('database', {
      failureThreshold: 2,
      recoveryTimeout: 10000, // 10 seconds
      monitoringPeriod: 30000,
      expectedErrorRate: 0.01, // 1%
    });

    this.registerCircuit('redis', {
      failureThreshold: 3,
      recoveryTimeout: 15000, // 15 seconds
      monitoringPeriod: 30000,
      expectedErrorRate: 0.02, // 2%
    });
  }

  registerCircuit(name: string, config: CircuitBreakerConfig): void {
    this.configs.set(name, config);
    this.circuits.set(name, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
    });
  }

  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);

    if (!circuit || !config) {
      throw new Error(`Circuit breaker not registered: ${circuitName}`);
    }

    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuit, config)) {
        circuit.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit ${circuitName} moved to HALF_OPEN state`);
      } else {
        this.logger.warn(`Circuit ${circuitName} is OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Service ${circuitName} is currently unavailable`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(circuitName);
      return result;
    } catch (error) {
      this.recordFailure(circuitName);
      
      if (fallback) {
        this.logger.log(`Using fallback for ${circuitName}`);
        return await fallback();
      }
      
      throw error;
    }
  }

  private shouldAttemptReset(circuit: CircuitBreakerStats, config: CircuitBreakerConfig): boolean {
    if (!circuit.nextAttemptTime) {
      circuit.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);
      return false;
    }

    return Date.now() >= circuit.nextAttemptTime.getTime();
  }

  private recordSuccess(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    circuit.successCount++;
    circuit.failureCount = 0; // Reset failure count on success

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.CLOSED;
      circuit.nextAttemptTime = undefined;
      this.logger.log(`Circuit ${circuitName} recovered, moved to CLOSED state`);
    }
  }

  private recordFailure(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);
    if (!circuit || !config) return;

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Failed during recovery attempt, go back to OPEN
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);
      this.logger.warn(`Circuit ${circuitName} failed during recovery, moved back to OPEN state`);
    } else if (circuit.failureCount >= config.failureThreshold) {
      // Too many failures, open the circuit
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);
      this.logger.error(`Circuit ${circuitName} opened due to ${circuit.failureCount} failures`);
    }
  }

  getCircuitStats(circuitName: string): CircuitBreakerStats | undefined {
    return this.circuits.get(circuitName);
  }

  getAllCircuitStats(): Map<string, CircuitBreakerStats> {
    return new Map(this.circuits);
  }

  isCircuitOpen(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    return circuit?.state === CircuitState.OPEN;
  }

  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.lastFailureTime = undefined;
      circuit.nextAttemptTime = undefined;
      this.logger.log(`Circuit ${circuitName} manually reset`);
    }
  }
}