import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  HealthCheckService, 
  HealthCheck, 
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '../config/redis.config';
import { SecretsService } from '../config/secrets.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private http: HttpHealthIndicator,
    private redisService: RedisService,
    private secretsService: SecretsService,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),
      
      // Redis health check
      () => this.checkRedis(),
      
      // Memory health check (alert if using more than 1GB)
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      
      // Memory RSS check (alert if using more than 1.5GB)
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024 * 1.5),
      
      // Disk health check (alert if less than 1GB free)
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
      
      // External API health checks
      () => this.checkOpenAI(),
      () => this.checkGoogleSTT(),
      
      // Configuration health check
      () => this.checkConfiguration(),
      
      // Secrets health check
      () => this.checkSecrets(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Critical services for readiness
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.checkConfiguration(),
      () => this.checkSecrets(),
    ]);
  }

  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([
      // Basic liveness checks
      () => this.memory.checkHeap('memory_heap', 2 * 1024 * 1024 * 1024), // 2GB
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.95 
      }),
    ]);
  }

  private async checkRedis() {
    try {
      const isHealthy = await this.redisService.healthCheck();
      return {
        redis: {
          status: isHealthy ? 'up' : 'down',
          message: isHealthy ? 'Redis is responding' : 'Redis is not responding',
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        redis: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  private async checkOpenAI() {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        return {
          openai: {
            status: 'down',
            message: 'OpenAI API key not configured',
          },
        };
      }

      // Simple check - we don't want to make actual API calls in health checks
      return {
        openai: {
          status: 'up',
          message: 'OpenAI API key configured',
        },
      };
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return {
        openai: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  private async checkGoogleSTT() {
    try {
      const apiKey = this.configService.get<string>('GOOGLE_STT_API_KEY');
      const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      
      if (!apiKey && !credentialsPath) {
        return {
          google_stt: {
            status: 'down',
            message: 'Google STT credentials not configured',
          },
        };
      }

      // Validate service account if using file-based auth
      if (credentialsPath) {
        const isValid = this.secretsService.validateGoogleServiceAccount();
        if (!isValid) {
          return {
            google_stt: {
              status: 'down',
              message: 'Google service account file invalid',
            },
          };
        }
      }

      return {
        google_stt: {
          status: 'up',
          message: 'Google STT credentials configured',
        },
      };
    } catch (error) {
      this.logger.error('Google STT health check failed:', error);
      return {
        google_stt: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  private async checkConfiguration() {
    try {
      const requiredConfigs = [
        'DATABASE_URL',
        'JWT_SECRET',
        'ENCRYPTION_MASTER_KEY',
      ];

      const missingConfigs = requiredConfigs.filter(
        config => !this.configService.get(config)
      );

      if (missingConfigs.length > 0) {
        return {
          configuration: {
            status: 'down',
            message: `Missing required configurations: ${missingConfigs.join(', ')}`,
          },
        };
      }

      return {
        configuration: {
          status: 'up',
          message: 'All required configurations present',
        },
      };
    } catch (error) {
      this.logger.error('Configuration health check failed:', error);
      return {
        configuration: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  private async checkSecrets() {
    try {
      const requiredSecrets = ['jwt_secret', 'encryption_key', 'openai_api_key'];
      const missingSecrets = requiredSecrets.filter(
        secret => !this.secretsService.hasSecret(secret)
      );

      if (missingSecrets.length > 0) {
        return {
          secrets: {
            status: 'down',
            message: `Missing required secrets: ${missingSecrets.join(', ')}`,
          },
        };
      }

      return {
        secrets: {
          status: 'up',
          message: 'All required secrets loaded',
          count: this.secretsService.getAllSecretNames().length,
        },
      };
    } catch (error) {
      this.logger.error('Secrets health check failed:', error);
      return {
        secrets: {
          status: 'down',
          message: error.message,
        },
      };
    }
  }

  @Get('metrics')
  async getMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      return {
        timestamp: new Date().toISOString(),
        uptime: uptime,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        cpu: process.cpuUsage(),
        version: {
          node: process.version,
          app: this.configService.get('npm_package_version', '1.0.0'),
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      throw error;
    }
  }
}