import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './config/database.config';
import { RedisService } from './config/redis.config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbHealth = await this.databaseService.healthCheck();
    const redisHealth = await this.redisService.healthCheck();
    
    return {
      status: dbHealth && redisHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ai-interview-assistant-backend',
      services: {
        database: dbHealth ? 'connected' : 'disconnected',
        redis: redisHealth ? 'connected' : 'disconnected',
      },
    };
  }

  @Get('db-info')
  async getDatabaseInfo() {
    try {
      const info = await this.databaseService.getConnectionInfo();
      return {
        status: 'success',
        data: info,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}