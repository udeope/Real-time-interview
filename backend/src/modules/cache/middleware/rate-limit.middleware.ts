import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitingService } from '../services/rate-limiting.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly rateLimitingService: RateLimitingService,
    private readonly performanceService: PerformanceMonitoringService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const originalSend = res.send;
    let isError = false;

    // Override res.send to capture response status
    res.send = function(body) {
      isError = res.statusCode >= 400;
      return originalSend.call(this, body);
    };

    try {
      // Check if IP is blacklisted
      const clientIp = this.getClientIp(req);
      const isBlacklisted = await this.rateLimitingService.isBlacklisted(clientIp);
      
      if (isBlacklisted) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      // Check if IP is whitelisted (skip rate limiting)
      const isWhitelisted = await this.rateLimitingService.isWhitelisted(clientIp);
      
      if (!isWhitelisted) {
        // Apply rate limiting based on endpoint
        const ruleId = this.determineRuleId(req);
        
        if (ruleId) {
          const rateLimitResult = await this.rateLimitingService.checkRateLimit(ruleId, req);
          
          if (!rateLimitResult.allowed) {
            res.set({
              'X-RateLimit-Limit': '0',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            });
            
            throw new HttpException(
              {
                message: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter,
                resetTime: rateLimitResult.resetTime,
              },
              HttpStatus.TOO_MANY_REQUESTS
            );
          }

          // Set rate limit headers
          res.set({
            'X-RateLimit-Limit': '100', // This should come from the rule
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          });
        }
      }

      // Continue to next middleware
      next();

      // Record performance metrics after response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.performanceService.recordEndpointMetrics(
          req.path,
          req.method,
          duration,
          isError
        );
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      this.performanceService.recordEndpointMetrics(
        req.path,
        req.method,
        duration,
        true
      );

      throw error;
    }
  }

  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private determineRuleId(req: Request): string | null {
    const path = req.path;
    const method = req.method;

    // Map endpoints to rate limiting rules
    if (path.startsWith('/api/auth/login')) {
      return 'auth-login';
    }
    
    if (path.startsWith('/api/transcription')) {
      return 'transcription';
    }
    
    if (path.startsWith('/api/responses')) {
      return 'response-generation';
    }
    
    if (path.startsWith('/socket.io')) {
      return 'websocket-connect';
    }
    
    if (path.startsWith('/api/')) {
      // Check if user is authenticated for user-specific rate limiting
      if (req.user) {
        return 'user-requests';
      }
      return 'api-general';
    }

    return null;
  }
}