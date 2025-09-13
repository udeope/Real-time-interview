import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('ProductionConfig');

export default registerAs('production', () => {
  const config = {
    // Environment
    nodeEnv: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '4000', 10),
    
    // Database Configuration
    database: {
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '50', 10),
      poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '30000', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000', 10),
    },

    // Redis Configuration
    redis: {
      url: process.env.REDIS_URL || 'redis://redis:6379',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '5', 10),
      lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    },

    // Security Configuration
    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      encryptionKey: process.env.ENCRYPTION_MASTER_KEY,
      corsOrigin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
      corsCredentials: process.env.CORS_CREDENTIALS === 'true',
      httpsOnly: process.env.NEXT_PUBLIC_ENABLE_HTTPS_ONLY === 'true',
    },

    // API Keys
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      googleStt: process.env.GOOGLE_STT_API_KEY,
      whisper: process.env.WHISPER_API_KEY,
      claude: process.env.CLAUDE_API_KEY,
      stripe: process.env.STRIPE_SECRET_KEY,
      stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
    },

    // External Integrations
    integrations: {
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      outlook: {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        redirectUri: process.env.OUTLOOK_REDIRECT_URI,
      },
      zoom: {
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
        redirectUri: process.env.ZOOM_REDIRECT_URI,
      },
      teams: {
        clientId: process.env.TEAMS_CLIENT_ID,
        clientSecret: process.env.TEAMS_CLIENT_SECRET,
        redirectUri: process.env.TEAMS_REDIRECT_URI,
      },
    },

    // AWS Configuration
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET,
      backupBucket: process.env.BACKUP_S3_BUCKET,
    },

    // Email Configuration
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      secure: process.env.SMTP_PORT === '465',
    },

    // Monitoring Configuration
    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      grafanaApiKey: process.env.GRAFANA_API_KEY,
      prometheusEndpoint: process.env.PROMETHEUS_ENDPOINT,
      logLevel: process.env.LOG_LEVEL || 'warn',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
    },

    // Performance Configuration
    performance: {
      cacheDefaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '7200', 10),
      cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || '100000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_API_MAX || '200', 10),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60000', 10),
    },

    // File Storage Configuration
    storage: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
      uploadDest: process.env.UPLOAD_DEST || '/app/uploads',
      exportDir: process.env.EXPORT_DIRECTORY || '/app/exports',
      dataExportDir: process.env.DATA_EXPORT_DIR || '/app/data-exports',
    },

    // Health Check Configuration
    healthCheck: {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    },

    // SSL Configuration
    ssl: {
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
      caPath: process.env.SSL_CA_PATH,
    },

    // Application URLs
    urls: {
      frontend: process.env.FRONTEND_URL || 'https://yourdomain.com',
      backend: process.env.BACKEND_URL || 'https://api.yourdomain.com',
    },
  };

  // Validate required production environment variables
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_MASTER_KEY',
    'OPENAI_API_KEY',
  ];

  const missingVars = requiredVars.filter(varName => {
    const keys = varName.split('.');
    let value = process.env;
    for (const key of keys) {
      value = value?.[key];
    }
    return !value;
  });

  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate API keys in production
  if (process.env.NODE_ENV === 'production') {
    const apiKeyWarnings = [];
    
    if (!config.apiKeys.googleStt) {
      apiKeyWarnings.push('GOOGLE_STT_API_KEY');
    }
    
    if (!config.monitoring.sentryDsn) {
      apiKeyWarnings.push('SENTRY_DSN');
    }

    if (apiKeyWarnings.length > 0) {
      logger.warn(`Missing optional API keys in production: ${apiKeyWarnings.join(', ')}`);
    }
  }

  return config;
});

export interface ProductionConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
    ssl: boolean | { rejectUnauthorized: boolean };
    connectionLimit: number;
    poolTimeout: number;
    idleTimeout: number;
  };
  redis: {
    url: string;
    maxRetries: number;
    lazyConnect: boolean;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    encryptionKey: string;
    corsOrigin: string;
    corsCredentials: boolean;
    httpsOnly: boolean;
  };
  apiKeys: {
    openai: string;
    googleStt?: string;
    whisper?: string;
    claude?: string;
    stripe?: string;
    stripeWebhook?: string;
  };
  integrations: {
    linkedin: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    };
    google: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      projectId?: string;
      credentialsPath?: string;
    };
    outlook: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    };
    zoom: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    };
    teams: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    };
  };
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    s3Bucket?: string;
    backupBucket?: string;
  };
  email: {
    host?: string;
    port: number;
    user?: string;
    password?: string;
    secure: boolean;
  };
  monitoring: {
    sentryDsn?: string;
    grafanaApiKey?: string;
    prometheusEndpoint?: string;
    logLevel: string;
    enableMetrics: boolean;
  };
  performance: {
    cacheDefaultTtl: number;
    cacheMaxSize: number;
    rateLimitMax: number;
    rateLimitWindow: number;
  };
  storage: {
    maxFileSize: number;
    uploadDest: string;
    exportDir: string;
    dataExportDir: string;
  };
  healthCheck: {
    timeout: number;
    interval: number;
  };
  ssl: {
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };
  urls: {
    frontend: string;
    backend: string;
  };
}