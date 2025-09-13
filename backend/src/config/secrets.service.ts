import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface SecretConfig {
  name: string;
  required: boolean;
  envVar: string;
  filePath?: string;
  defaultValue?: string;
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private secrets: Map<string, string> = new Map();

  private readonly secretConfigs: SecretConfig[] = [
    // Database secrets
    {
      name: 'database_password',
      required: true,
      envVar: 'POSTGRES_PASSWORD',
      filePath: '/run/secrets/postgres_password',
    },
    
    // JWT secrets
    {
      name: 'jwt_secret',
      required: true,
      envVar: 'JWT_SECRET',
      filePath: '/run/secrets/jwt_secret',
    },
    
    // Encryption secrets
    {
      name: 'encryption_key',
      required: true,
      envVar: 'ENCRYPTION_MASTER_KEY',
      filePath: '/run/secrets/encryption_master_key',
    },
    
    // API Keys
    {
      name: 'openai_api_key',
      required: true,
      envVar: 'OPENAI_API_KEY',
      filePath: '/run/secrets/openai_api_key',
    },
    {
      name: 'google_stt_api_key',
      required: false,
      envVar: 'GOOGLE_STT_API_KEY',
      filePath: '/run/secrets/google_stt_api_key',
    },
    {
      name: 'whisper_api_key',
      required: false,
      envVar: 'WHISPER_API_KEY',
      filePath: '/run/secrets/whisper_api_key',
    },
    {
      name: 'claude_api_key',
      required: false,
      envVar: 'CLAUDE_API_KEY',
      filePath: '/run/secrets/claude_api_key',
    },
    
    // External Integration secrets
    {
      name: 'linkedin_client_secret',
      required: false,
      envVar: 'LINKEDIN_CLIENT_SECRET',
      filePath: '/run/secrets/linkedin_client_secret',
    },
    {
      name: 'google_client_secret',
      required: false,
      envVar: 'GOOGLE_CLIENT_SECRET',
      filePath: '/run/secrets/google_client_secret',
    },
    {
      name: 'outlook_client_secret',
      required: false,
      envVar: 'OUTLOOK_CLIENT_SECRET',
      filePath: '/run/secrets/outlook_client_secret',
    },
    {
      name: 'zoom_client_secret',
      required: false,
      envVar: 'ZOOM_CLIENT_SECRET',
      filePath: '/run/secrets/zoom_client_secret',
    },
    {
      name: 'teams_client_secret',
      required: false,
      envVar: 'TEAMS_CLIENT_SECRET',
      filePath: '/run/secrets/teams_client_secret',
    },
    
    // Payment secrets
    {
      name: 'stripe_secret_key',
      required: false,
      envVar: 'STRIPE_SECRET_KEY',
      filePath: '/run/secrets/stripe_secret_key',
    },
    {
      name: 'stripe_webhook_secret',
      required: false,
      envVar: 'STRIPE_WEBHOOK_SECRET',
      filePath: '/run/secrets/stripe_webhook_secret',
    },
    
    // AWS secrets
    {
      name: 'aws_access_key_id',
      required: false,
      envVar: 'AWS_ACCESS_KEY_ID',
      filePath: '/run/secrets/aws_access_key_id',
    },
    {
      name: 'aws_secret_access_key',
      required: false,
      envVar: 'AWS_SECRET_ACCESS_KEY',
      filePath: '/run/secrets/aws_secret_access_key',
    },
    
    // Email secrets
    {
      name: 'smtp_password',
      required: false,
      envVar: 'SMTP_PASSWORD',
      filePath: '/run/secrets/smtp_password',
    },
    
    // Monitoring secrets
    {
      name: 'sentry_dsn',
      required: false,
      envVar: 'SENTRY_DSN',
      filePath: '/run/secrets/sentry_dsn',
    },
    {
      name: 'grafana_api_key',
      required: false,
      envVar: 'GRAFANA_API_KEY',
      filePath: '/run/secrets/grafana_api_key',
    },
    
    // Backup secrets
    {
      name: 'backup_encryption_key',
      required: false,
      envVar: 'BACKUP_ENCRYPTION_KEY',
      filePath: '/run/secrets/backup_encryption_key',
    },
  ];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.loadSecrets();
    this.validateRequiredSecrets();
  }

  private async loadSecrets(): Promise<void> {
    this.logger.log('Loading secrets from environment and files...');

    for (const config of this.secretConfigs) {
      let secretValue: string | undefined;

      // First, try to get from environment variable
      secretValue = process.env[config.envVar];

      // If not found in env and file path is provided, try to read from file
      if (!secretValue && config.filePath) {
        try {
          if (fs.existsSync(config.filePath)) {
            secretValue = fs.readFileSync(config.filePath, 'utf8').trim();
            this.logger.debug(`Loaded secret ${config.name} from file: ${config.filePath}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to read secret file ${config.filePath}: ${error.message}`);
        }
      }

      // Use default value if provided and no secret found
      if (!secretValue && config.defaultValue) {
        secretValue = config.defaultValue;
        this.logger.debug(`Using default value for secret: ${config.name}`);
      }

      if (secretValue) {
        this.secrets.set(config.name, secretValue);
        // Update environment variable for other services
        process.env[config.envVar] = secretValue;
      }
    }

    this.logger.log(`Loaded ${this.secrets.size} secrets successfully`);
  }

  private validateRequiredSecrets(): void {
    const missingSecrets: string[] = [];

    for (const config of this.secretConfigs) {
      if (config.required && !this.secrets.has(config.name)) {
        missingSecrets.push(config.name);
      }
    }

    if (missingSecrets.length > 0) {
      const errorMessage = `Missing required secrets: ${missingSecrets.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('All required secrets validated successfully');
  }

  getSecret(name: string): string | undefined {
    return this.secrets.get(name);
  }

  hasSecret(name: string): boolean {
    return this.secrets.has(name);
  }

  getAllSecretNames(): string[] {
    return Array.from(this.secrets.keys());
  }

  // Method to safely log configuration without exposing secrets
  logConfiguration(): void {
    const configSummary = this.secretConfigs.map(config => ({
      name: config.name,
      required: config.required,
      loaded: this.secrets.has(config.name),
      source: this.secrets.has(config.name) 
        ? (process.env[config.envVar] ? 'environment' : 'file')
        : 'missing'
    }));

    this.logger.log('Secrets configuration summary:');
    configSummary.forEach(item => {
      const status = item.loaded ? '✓' : '✗';
      const requiredText = item.required ? '(required)' : '(optional)';
      this.logger.log(`  ${status} ${item.name} ${requiredText} - ${item.source}`);
    });
  }

  // Method to validate Google service account file
  validateGoogleServiceAccount(): boolean {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      this.logger.warn('Google service account credentials path not set');
      return false;
    }

    try {
      if (!fs.existsSync(credentialsPath)) {
        this.logger.error(`Google service account file not found: ${credentialsPath}`);
        return false;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      
      if (missingFields.length > 0) {
        this.logger.error(`Google service account file missing fields: ${missingFields.join(', ')}`);
        return false;
      }

      this.logger.log('Google service account credentials validated successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to validate Google service account: ${error.message}`);
      return false;
    }
  }

  // Method to rotate secrets (for future implementation)
  async rotateSecret(name: string, newValue: string): Promise<void> {
    if (!this.secrets.has(name)) {
      throw new Error(`Secret ${name} not found`);
    }

    this.secrets.set(name, newValue);
    
    // Find the corresponding environment variable
    const config = this.secretConfigs.find(c => c.name === name);
    if (config) {
      process.env[config.envVar] = newValue;
    }

    this.logger.log(`Secret ${name} rotated successfully`);
  }
}