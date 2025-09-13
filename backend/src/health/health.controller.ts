import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthCheckService,
    HealthCheck,
    TypeOrmHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HttpHealthIndicator,
    HealthIndicatorResult,
    HealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '../config/redis.config';
import { SecretsService } from '../config/secrets.service';

class CustomHealthIndicator extends HealthIndicator {
    constructor(
        private redisService: RedisService,
        private secretsService: SecretsService,
        private configService: ConfigService,
    ) {
        super();
    }

    async checkRedis(key: string): Promise<HealthIndicatorResult> {
        try {
            const isHealthy = await this.redisService.healthCheck();
            const result = this.getStatus(key, isHealthy, {
                message: isHealthy ? 'Redis is responding' : 'Redis is not responding',
            });
            return result;
        } catch (error) {
            const result = this.getStatus(key, false, {
                message: error.message,
            });
            return result;
        }
    }

    async checkOpenAI(key: string): Promise<HealthIndicatorResult> {
        try {
            const apiKey = this.configService.get<string>('OPENAI_API_KEY');
            const isHealthy = !!apiKey;
            const result = this.getStatus(key, isHealthy, {
                message: isHealthy ? 'OpenAI API key configured' : 'OpenAI API key not configured',
            });
            return result;
        } catch (error) {
            const result = this.getStatus(key, false, {
                message: error.message,
            });
            return result;
        }
    }

    async checkGoogleSTT(key: string): Promise<HealthIndicatorResult> {
        try {
            const apiKey = this.configService.get<string>('GOOGLE_STT_API_KEY');
            const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
            const isHealthy = !!(apiKey || credentialsPath);
            
            let message = 'Google STT credentials configured';
            if (!isHealthy) {
                message = 'Google STT credentials not configured';
            } else if (credentialsPath) {
                const isValid = this.secretsService.validateGoogleServiceAccount();
                if (!isValid) {
                    message = 'Google service account file invalid';
                }
            }

            const result = this.getStatus(key, isHealthy, { message });
            return result;
        } catch (error) {
            const result = this.getStatus(key, false, {
                message: error.message,
            });
            return result;
        }
    }

    async checkConfiguration(key: string): Promise<HealthIndicatorResult> {
        try {
            const requiredConfigs = [
                'DATABASE_URL',
                'JWT_SECRET',
                'ENCRYPTION_MASTER_KEY',
            ];

            const missingConfigs = requiredConfigs.filter(
                config => !this.configService.get(config)
            );

            const isHealthy = missingConfigs.length === 0;
            const message = isHealthy 
                ? 'All required configurations present'
                : `Missing required configurations: ${missingConfigs.join(', ')}`;

            const result = this.getStatus(key, isHealthy, { message });
            return result;
        } catch (error) {
            const result = this.getStatus(key, false, {
                message: error.message,
            });
            return result;
        }
    }

    async checkSecrets(key: string): Promise<HealthIndicatorResult> {
        try {
            const requiredSecrets = ['jwt_secret', 'encryption_key', 'openai_api_key'];
            const missingSecrets = requiredSecrets.filter(
                secret => !this.secretsService.hasSecret(secret)
            );

            const isHealthy = missingSecrets.length === 0;
            const message = isHealthy 
                ? 'All required secrets loaded'
                : `Missing required secrets: ${missingSecrets.join(', ')}`;

            const data = isHealthy ? { count: this.secretsService.getAllSecretNames().length } : {};
            const result = this.getStatus(key, isHealthy, { message, ...data });
            return result;
        } catch (error) {
            const result = this.getStatus(key, false, {
                message: error.message,
            });
            return result;
        }
    }
}

@Controller('health')
export class HealthController {
    private readonly logger = new Logger(HealthController.name);
    private readonly customHealthIndicator: CustomHealthIndicator;

    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private http: HttpHealthIndicator,
        private redisService: RedisService,
        private secretsService: SecretsService,
        private configService: ConfigService,
    ) {
        this.customHealthIndicator = new CustomHealthIndicator(
            redisService,
            secretsService,
            configService,
        );
    }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Database health check
            () => this.db.pingCheck('database'),

            // Redis health check
            () => this.customHealthIndicator.checkRedis('redis'),

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
            () => this.customHealthIndicator.checkOpenAI('openai'),
            () => this.customHealthIndicator.checkGoogleSTT('google_stt'),

            // Configuration health check
            () => this.customHealthIndicator.checkConfiguration('configuration'),

            // Secrets health check
            () => this.customHealthIndicator.checkSecrets('secrets'),
        ]);
    }

    @Get('ready')
    @HealthCheck()
    readiness() {
        return this.health.check([
            // Critical services for readiness
            () => this.db.pingCheck('database'),
            () => this.customHealthIndicator.checkRedis('redis'),
            () => this.customHealthIndicator.checkConfiguration('configuration'),
            () => this.customHealthIndicator.checkSecrets('secrets'),
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