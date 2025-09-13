import { registerAs } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export default registerAs('logging', (): WinstonModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info');

  const formats = [
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ];

  // Add colorization for non-production environments
  if (!isProduction) {
    formats.unshift(winston.format.colorize({ all: true }));
  }

  const transports: winston.transport[] = [];

  // Console transport
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize({ all: !isProduction }),
        winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
          let log = `${timestamp} [${level}]`;
          
          if (context) {
            log += ` [${context}]`;
          }
          
          log += ` ${message}`;
          
          if (stack) {
            log += `\n${stack}`;
          }
          
          if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
          }
          
          return log;
        })
      ),
    })
  );

  // File transports for production
  if (isProduction) {
    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: '/app/logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(...formats),
        auditFile: '/app/logs/.audit/error-audit.json',
      })
    );

    // Combined logs
    transports.push(
      new DailyRotateFile({
        filename: '/app/logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(...formats),
        auditFile: '/app/logs/.audit/combined-audit.json',
      })
    );

    // Application logs
    transports.push(
      new DailyRotateFile({
        filename: '/app/logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        maxSize: '20m',
        maxFiles: '7d',
        format: winston.format.combine(...formats),
        auditFile: '/app/logs/.audit/app-audit.json',
      })
    );

    // Performance logs
    transports.push(
      new DailyRotateFile({
        filename: '/app/logs/performance-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'debug',
        maxSize: '50m',
        maxFiles: '3d',
        format: winston.format.combine(...formats),
        auditFile: '/app/logs/.audit/performance-audit.json',
      })
    );

    // Security logs
    transports.push(
      new DailyRotateFile({
        filename: '/app/logs/security-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '90d',
        format: winston.format.combine(...formats),
        auditFile: '/app/logs/.audit/security-audit.json',
      })
    );
  }

  return {
    level: logLevel,
    format: winston.format.combine(...formats),
    transports,
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test',
  };
});

// Custom logger for specific use cases
export const createCustomLogger = (service: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info');

  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.label({ label: service }),
      winston.format.json()
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: !isProduction }),
          winston.format.printf(({ timestamp, level, message, label, stack, ...meta }) => {
            let log = `${timestamp} [${level}] [${label}] ${message}`;
            
            if (stack) {
              log += `\n${stack}`;
            }
            
            if (Object.keys(meta).length > 0) {
              log += `\n${JSON.stringify(meta, null, 2)}`;
            }
            
            return log;
          })
        ),
      }),
    ],
  });
};

// Security logger for audit trails
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { type: 'security' },
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: '/app/logs/security-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '90d',
        auditFile: '/app/logs/.audit/security-audit.json',
      })
    ] : []),
  ],
});

// Performance logger for monitoring
export const performanceLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { type: 'performance' },
  transports: [
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: '/app/logs/performance-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '3d',
        auditFile: '/app/logs/.audit/performance-audit.json',
      })
    ] : [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    ]),
  ],
});

// Error logger for critical issues
export const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { type: 'error' },
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: '/app/logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        auditFile: '/app/logs/.audit/error-audit.json',
      })
    ] : []),
  ],
});

// Audit logger for compliance
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { type: 'audit' },
  transports: [
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: '/app/logs/audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '2555d', // 7 years for compliance
        auditFile: '/app/logs/.audit/audit-audit.json',
      })
    ] : [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    ]),
  ],
});