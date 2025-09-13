import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { RedisService } from '../config/redis.config';
import { SecretsService } from '../config/secrets.service';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [RedisService, SecretsService],
})
export class HealthModule {}