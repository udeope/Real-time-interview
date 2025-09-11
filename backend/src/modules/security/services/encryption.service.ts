import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../../config/prisma.service';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  authTag: string;
  key: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a new encryption key for a user and data type
   */
  async generateUserKey(userId: string, keyType: string): Promise<string> {
    try {
      // Generate a random key
      const key = crypto.randomBytes(this.keyLength);
      const salt = crypto.randomBytes(16);
      
      // Hash the key for storage
      const keyHash = crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256');
      
      // Store the key metadata in database
      await this.prisma.encryptionKey.upsert({
        where: {
          userId_keyType: {
            userId,
            keyType,
          },
        },
        update: {
          keyHash: keyHash.toString('hex'),
          salt: salt.toString('hex'),
          isActive: true,
          createdAt: new Date(),
        },
        create: {
          userId,
          keyType,
          keyHash: keyHash.toString('hex'),
          salt: salt.toString('hex'),
          algorithm: this.algorithm,
          isActive: true,
        },
      });

      return key.toString('hex');
    } catch (error) {
      this.logger.error(`Failed to generate user key: ${error.message}`);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Retrieve or generate encryption key for user and data type
   */
  async getUserKey(userId: string, keyType: string): Promise<string> {
    try {
      const keyRecord = await this.prisma.encryptionKey.findUnique({
        where: {
          userId_keyType: {
            userId,
            keyType,
          },
        },
      });

      if (!keyRecord || !keyRecord.isActive) {
        // Generate new key if none exists or is inactive
        return await this.generateUserKey(userId, keyType);
      }

      // For security, we don't store the actual key, only its hash
      // In a real implementation, you might use a key management service
      // For now, we'll generate a deterministic key from user data
      const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');
      if (!masterKey) {
        throw new Error('Master encryption key not configured');
      }

      const derivedKey = crypto.pbkdf2Sync(
        `${userId}:${keyType}`,
        Buffer.from(keyRecord.salt, 'hex'),
        100000,
        this.keyLength,
        'sha256'
      );

      return derivedKey.toString('hex');
    } catch (error) {
      this.logger.error(`Failed to retrieve user key: ${error.message}`);
      throw new Error('Failed to retrieve encryption key');
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, userId: string, keyType: string): Promise<EncryptionResult> {
    try {
      const key = await this.getUserKey(userId, keyType);
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, keyBuffer);
      cipher.setAAD(Buffer.from(userId)); // Additional authenticated data
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Failed to encrypt data: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(params: DecryptionParams, userId: string): Promise<string> {
    try {
      const keyBuffer = Buffer.from(params.key, 'hex');
      const iv = Buffer.from(params.iv, 'hex');
      const authTag = Buffer.from(params.authTag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
      decipher.setAAD(Buffer.from(userId)); // Additional authenticated data
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(params.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt data: ${error.message}`);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt audio data
   */
  async encryptAudioData(audioBuffer: Buffer, userId: string): Promise<EncryptionResult> {
    const audioBase64 = audioBuffer.toString('base64');
    return this.encryptData(audioBase64, userId, 'audio');
  }

  /**
   * Decrypt audio data
   */
  async decryptAudioData(params: DecryptionParams, userId: string): Promise<Buffer> {
    const decryptedBase64 = await this.decryptData(params, userId);
    return Buffer.from(decryptedBase64, 'base64');
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hashData(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha256');
    return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const verifyHash = crypto.pbkdf2Sync(data, Buffer.from(salt, 'hex'), 100000, 64, 'sha256');
      return hash === verifyHash.toString('hex');
    } catch (error) {
      return false;
    }
  }

  /**
   * Rotate encryption keys (for security best practices)
   */
  async rotateUserKeys(userId: string): Promise<void> {
    try {
      const keyTypes = ['audio', 'transcription', 'profile'];
      
      for (const keyType of keyTypes) {
        // Mark old key as inactive
        await this.prisma.encryptionKey.updateMany({
          where: {
            userId,
            keyType,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        // Generate new key
        await this.generateUserKey(userId, keyType);
      }

      this.logger.log(`Rotated encryption keys for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to rotate keys for user ${userId}: ${error.message}`);
      throw new Error('Failed to rotate encryption keys');
    }
  }
}