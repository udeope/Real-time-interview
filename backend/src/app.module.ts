import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { InterviewSessionModule } from './modules/interview-session/interview-session.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { ContextAnalysisModule } from './modules/context-analysis/context-analysis.module';
import { ResponseGenerationModule } from './modules/response-generation/response-generation.module';
import { PracticeModule } from './modules/practice/practice.module';
import { CacheModule } from './modules/cache/cache.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ErrorHandlingModule } from './common/errors/error-handling.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RateLimitMiddleware } from './modules/cache/middleware/rate-limit.middleware';
import { CacheMiddleware } from './modules/cache/middleware/cache.middleware';
import { validateEnvironment } from './config/env.validation';
import cacheConfig from './config/cache.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
      load: [cacheConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ErrorHandlingModule,
    DatabaseModule,
    CacheModule,
    AuthModule,
    UserModule,
    InterviewSessionModule,
    WebSocketModule,
    TranscriptionModule,
    ContextAnalysisModule,
    ResponseGenerationModule,
    PracticeModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting middleware to all routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');

    // Apply cache middleware to GET routes
    consumer
      .apply(CacheMiddleware)
      .forRoutes('api/*');
  }
}