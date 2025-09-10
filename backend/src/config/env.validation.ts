import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, validateSync } from 'class-validator';

export class EnvironmentVariables {
  // Database Configuration
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string = 'redis://localhost:6379';

  // Application Configuration
  @IsString()
  @IsOptional()
  NODE_ENV?: string = 'development';

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  PORT?: number = 3001;

  // API Keys
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLOUD_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_APPLICATION_CREDENTIALS?: string;

  // Authentication
  @IsString()
  @IsOptional()
  JWT_SECRET?: string = 'default-jwt-secret-change-in-production';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '7d';

  // External Integrations
  @IsString()
  @IsOptional()
  LINKEDIN_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  LINKEDIN_CLIENT_SECRET?: string;

  // Application URLs
  @IsString()
  @IsOptional()
  FRONTEND_URL?: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  BACKEND_URL?: string = 'http://localhost:3001';

  // Rate Limiting
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL?: number = 60;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LIMIT?: number = 100;

  // File Upload
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE?: number = 10485760; // 10MB

  @IsString()
  @IsOptional()
  UPLOAD_DEST?: string = './uploads';

  // Monitoring
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  ENABLE_METRICS?: boolean = true;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      Object.values(error.constraints || {}).join(', ')
    ).join('; ');
    
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}

export function getRequiredEnvVars(): string[] {
  return [
    'DATABASE_URL',
  ];
}

export function getOptionalEnvVars(): string[] {
  return [
    'REDIS_URL',
    'NODE_ENV',
    'PORT',
    'OPENAI_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL',
    'RATE_LIMIT_TTL',
    'RATE_LIMIT_LIMIT',
    'MAX_FILE_SIZE',
    'UPLOAD_DEST',
    'LOG_LEVEL',
    'ENABLE_METRICS',
  ];
}