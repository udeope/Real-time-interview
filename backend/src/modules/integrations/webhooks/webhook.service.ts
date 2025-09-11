import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface WebhookEndpoint {
  id: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount: number;
  maxRetries: number;
}

export type WebhookEvent = 
  | 'session.started'
  | 'session.completed'
  | 'session.paused'
  | 'transcription.completed'
  | 'response.generated'
  | 'practice.completed'
  | 'integration.connected'
  | 'integration.disconnected'
  | 'export.completed'
  | 'user.profile_updated';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  userId: string;
  data: any;
  webhookId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createWebhook(userId: string, url: string, events: WebhookEvent[]): Promise<WebhookEndpoint> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    // Generate secret for signature verification
    const secret = this.generateSecret();

    const webhook: WebhookEndpoint = {
      id: this.generateWebhookId(),
      userId,
      url,
      events,
      secret,
      isActive: true,
      createdAt: new Date(),
      failureCount: 0,
      maxRetries: this.maxRetries,
    };

    // Store webhook in database
    await this.storeWebhook(webhook);

    // Test webhook endpoint
    await this.testWebhook(webhook);

    this.logger.log(`Webhook created for user ${userId}: ${webhook.id}`);
    return webhook;
  }

  async updateWebhook(webhookId: string, userId: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const webhook = await this.getWebhook(webhookId, userId);
    if (!webhook) {
      throw new BadRequestException('Webhook not found');
    }

    // Update webhook
    const updatedWebhook = { ...webhook, ...updates };
    await this.storeWebhook(updatedWebhook);

    this.logger.log(`Webhook updated: ${webhookId}`);
    return updatedWebhook;
  }

  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const webhook = await this.getWebhook(webhookId, userId);
    if (!webhook) {
      throw new BadRequestException('Webhook not found');
    }

    // Delete webhook from database
    await this.removeWebhook(webhookId);

    this.logger.log(`Webhook deleted: ${webhookId}`);
  }

  async triggerWebhook(event: WebhookEvent, userId: string, data: any): Promise<void> {
    const webhooks = await this.getUserWebhooks(userId);
    const relevantWebhooks = webhooks.filter(
      webhook => webhook.isActive && webhook.events.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      userId,
      data,
      webhookId: '', // Will be set for each webhook
    };

    // Trigger webhooks in parallel
    const deliveryPromises = relevantWebhooks.map(webhook => 
      this.deliverWebhook(webhook, payload)
    );

    await Promise.allSettled(deliveryPromises);
  }

  async retryFailedWebhooks(): Promise<void> {
    const failedDeliveries = await this.getFailedDeliveries();
    
    for (const delivery of failedDeliveries) {
      if (delivery.attempts < this.maxRetries && this.shouldRetry(delivery)) {
        await this.retryDelivery(delivery);
      }
    }
  }

  async getWebhookDeliveries(webhookId: string, userId: string, limit = 50): Promise<WebhookDelivery[]> {
    // This would fetch from database
    return [];
  }

  async testWebhook(webhook: WebhookEndpoint): Promise<boolean> {
    const testPayload: WebhookPayload = {
      event: 'session.started',
      timestamp: new Date().toISOString(),
      userId: webhook.userId,
      data: { test: true },
      webhookId: webhook.id,
    };

    try {
      const signature = this.generateSignature(JSON.stringify(testPayload), webhook.secret);
      
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': 'test',
            'User-Agent': 'AI-Interview-Assistant-Webhook/1.0',
          },
          timeout: 10000,
        })
      );

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      this.logger.warn(`Webhook test failed for ${webhook.id}: ${error.message}`);
      return false;
    }
  }

  private async deliverWebhook(webhook: WebhookEndpoint, payload: WebhookPayload): Promise<void> {
    const deliveryPayload = { ...payload, webhookId: webhook.id };
    const signature = this.generateSignature(JSON.stringify(deliveryPayload), webhook.secret);

    const delivery: WebhookDelivery = {
      id: this.generateDeliveryId(),
      webhookId: webhook.id,
      event: payload.event,
      payload: deliveryPayload,
      status: 'pending',
      attempts: 0,
    };

    try {
      delivery.attempts++;
      delivery.lastAttempt = new Date();

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, deliveryPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': payload.event,
            'X-Webhook-Delivery': delivery.id,
            'User-Agent': 'AI-Interview-Assistant-Webhook/1.0',
          },
          timeout: 30000,
        })
      );

      delivery.status = 'delivered';
      delivery.responseStatus = response.status;
      delivery.responseBody = JSON.stringify(response.data).substring(0, 1000); // Limit size

      // Update webhook last triggered
      webhook.lastTriggered = new Date();
      webhook.failureCount = 0;
      await this.storeWebhook(webhook);

      this.logger.log(`Webhook delivered successfully: ${webhook.id} -> ${payload.event}`);

    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.responseStatus = error.response?.status;

      // Schedule retry if within limits
      if (delivery.attempts < this.maxRetries) {
        delivery.status = 'retrying';
        delivery.nextRetry = new Date(Date.now() + this.retryDelays[delivery.attempts - 1]);
      } else {
        // Disable webhook after max failures
        webhook.failureCount++;
        if (webhook.failureCount >= 10) {
          webhook.isActive = false;
          await this.storeWebhook(webhook);
          this.logger.warn(`Webhook disabled due to repeated failures: ${webhook.id}`);
        }
      }

      this.logger.error(`Webhook delivery failed: ${webhook.id} -> ${payload.event}: ${error.message}`);
    }

    // Store delivery record
    await this.storeDelivery(delivery);
  }

  private async retryDelivery(delivery: WebhookDelivery): Promise<void> {
    const webhook = await this.getWebhookById(delivery.webhookId);
    if (!webhook || !webhook.isActive) {
      return;
    }

    await this.deliverWebhook(webhook, delivery.payload);
  }

  private shouldRetry(delivery: WebhookDelivery): boolean {
    if (!delivery.nextRetry) {
      return false;
    }
    return new Date() >= delivery.nextRetry;
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateWebhookId(): string {
    return `wh_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateDeliveryId(): string {
    return `whd_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || 
             (parsed.protocol === 'http:' && parsed.hostname === 'localhost');
    } catch {
      return false;
    }
  }

  // Database operations (would be implemented with actual database)
  private async storeWebhook(webhook: WebhookEndpoint): Promise<void> {
    // Store webhook in database
    this.logger.debug(`Storing webhook: ${webhook.id}`);
  }

  private async removeWebhook(webhookId: string): Promise<void> {
    // Remove webhook from database
    this.logger.debug(`Removing webhook: ${webhookId}`);
  }

  private async getWebhook(webhookId: string, userId: string): Promise<WebhookEndpoint | null> {
    // Fetch webhook from database
    return null;
  }

  private async getWebhookById(webhookId: string): Promise<WebhookEndpoint | null> {
    // Fetch webhook from database
    return null;
  }

  private async getUserWebhooks(userId: string): Promise<WebhookEndpoint[]> {
    // Fetch user webhooks from database
    return [];
  }

  private async storeDelivery(delivery: WebhookDelivery): Promise<void> {
    // Store delivery record in database
    this.logger.debug(`Storing delivery: ${delivery.id}`);
  }

  private async getFailedDeliveries(): Promise<WebhookDelivery[]> {
    // Fetch failed deliveries from database
    return [];
  }
}