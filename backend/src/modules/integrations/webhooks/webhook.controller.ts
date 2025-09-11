import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WebhookService, WebhookEvent } from './webhook.service';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('integrations/webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  async createWebhook(
    @Body() body: { url: string; events: WebhookEvent[] },
    @Req() req: Request,
  ) {
    const webhook = await this.webhookService.createWebhook(
      req.user.id,
      body.url,
      body.events
    );

    return {
      message: 'Webhook created successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        secret: webhook.secret, // Include secret for initial setup
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved successfully' })
  async getUserWebhooks(@Req() req: Request) {
    // This would fetch user webhooks from database
    return {
      webhooks: [],
      count: 0,
    };
  }

  @Get(':webhookId')
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiResponse({ status: 200, description: 'Webhook details retrieved successfully' })
  async getWebhook(
    @Param('webhookId') webhookId: string,
    @Req() req: Request,
  ) {
    // This would fetch webhook from database
    return {
      webhook: null,
    };
  }

  @Put(':webhookId')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  async updateWebhook(
    @Param('webhookId') webhookId: string,
    @Body() body: { url?: string; events?: WebhookEvent[]; isActive?: boolean },
    @Req() req: Request,
  ) {
    const webhook = await this.webhookService.updateWebhook(
      webhookId,
      req.user.id,
      body
    );

    return {
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        lastTriggered: webhook.lastTriggered,
      },
    };
  }

  @Delete(':webhookId')
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  async deleteWebhook(
    @Param('webhookId') webhookId: string,
    @Req() req: Request,
  ) {
    await this.webhookService.deleteWebhook(webhookId, req.user.id);

    return {
      message: 'Webhook deleted successfully',
      webhookId,
    };
  }

  @Post(':webhookId/test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  async testWebhook(
    @Param('webhookId') webhookId: string,
    @Req() req: Request,
  ) {
    // This would fetch webhook and test it
    const success = false; // Placeholder

    return {
      message: success ? 'Webhook test successful' : 'Webhook test failed',
      webhookId,
      success,
      testedAt: new Date().toISOString(),
    };
  }

  @Get(':webhookId/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponse({ status: 200, description: 'Delivery history retrieved successfully' })
  async getWebhookDeliveries(
    @Param('webhookId') webhookId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Req() req: Request,
  ) {
    const deliveries = await this.webhookService.getWebhookDeliveries(
      webhookId,
      req.user.id,
      limit || 50
    );

    return {
      deliveries,
      count: deliveries.length,
      limit: limit || 50,
      offset: offset || 0,
    };
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger webhook for testing' })
  @ApiResponse({ status: 200, description: 'Webhook triggered successfully' })
  async triggerWebhook(
    @Body() body: { event: WebhookEvent; data?: any },
    @Req() req: Request,
  ) {
    await this.webhookService.triggerWebhook(
      body.event,
      req.user.id,
      body.data || { test: true, triggeredManually: true }
    );

    return {
      message: 'Webhook triggered successfully',
      event: body.event,
      triggeredAt: new Date().toISOString(),
    };
  }

  @Get('events/available')
  @ApiOperation({ summary: 'Get available webhook events' })
  @ApiResponse({ status: 200, description: 'Available events retrieved successfully' })
  async getAvailableEvents() {
    const events = [
      {
        event: 'session.started',
        description: 'Triggered when an interview session is started',
        payload: {
          sessionId: 'string',
          jobContext: 'object',
          startTime: 'string (ISO 8601)',
        },
      },
      {
        event: 'session.completed',
        description: 'Triggered when an interview session is completed',
        payload: {
          sessionId: 'string',
          duration: 'number (minutes)',
          endTime: 'string (ISO 8601)',
          summary: 'object',
        },
      },
      {
        event: 'session.paused',
        description: 'Triggered when an interview session is paused',
        payload: {
          sessionId: 'string',
          pausedAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'transcription.completed',
        description: 'Triggered when audio transcription is completed',
        payload: {
          sessionId: 'string',
          transcriptionId: 'string',
          text: 'string',
          confidence: 'number',
        },
      },
      {
        event: 'response.generated',
        description: 'Triggered when AI response suggestions are generated',
        payload: {
          sessionId: 'string',
          questionId: 'string',
          responses: 'array',
          generatedAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'practice.completed',
        description: 'Triggered when a practice session is completed',
        payload: {
          practiceSessionId: 'string',
          score: 'number',
          feedback: 'object',
          completedAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'integration.connected',
        description: 'Triggered when a third-party integration is connected',
        payload: {
          integrationType: 'string',
          provider: 'string',
          connectedAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'integration.disconnected',
        description: 'Triggered when a third-party integration is disconnected',
        payload: {
          integrationType: 'string',
          provider: 'string',
          disconnectedAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'export.completed',
        description: 'Triggered when a data export is completed',
        payload: {
          exportId: 'string',
          format: 'string',
          downloadUrl: 'string',
          expiresAt: 'string (ISO 8601)',
        },
      },
      {
        event: 'user.profile_updated',
        description: 'Triggered when user profile is updated',
        payload: {
          updatedFields: 'array',
          updatedAt: 'string (ISO 8601)',
        },
      },
    ];

    return {
      events,
      count: events.length,
      documentation: {
        signatureHeader: 'X-Webhook-Signature',
        eventHeader: 'X-Webhook-Event',
        deliveryHeader: 'X-Webhook-Delivery',
        userAgent: 'AI-Interview-Assistant-Webhook/1.0',
        signatureMethod: 'HMAC-SHA256',
        contentType: 'application/json',
      },
    };
  }

  @Get('documentation/integration')
  @ApiOperation({ summary: 'Get webhook integration documentation' })
  @ApiResponse({ status: 200, description: 'Integration documentation retrieved successfully' })
  async getIntegrationDocumentation() {
    return {
      documentation: {
        overview: 'Webhooks allow you to receive real-time notifications when events occur in your AI Interview Assistant account.',
        
        setup: {
          step1: 'Create a webhook endpoint in your application that can receive POST requests',
          step2: 'Register the webhook URL and select the events you want to receive',
          step3: 'Verify webhook signatures using the provided secret',
          step4: 'Handle webhook events in your application',
        },

        security: {
          signature: 'All webhook payloads are signed with HMAC-SHA256 using your webhook secret',
          header: 'The signature is included in the X-Webhook-Signature header',
          verification: 'Always verify the signature before processing webhook data',
        },

        retries: {
          policy: 'Failed webhooks are retried up to 3 times with exponential backoff',
          delays: ['1 second', '5 seconds', '15 seconds'],
          disabling: 'Webhooks are automatically disabled after 10 consecutive failures',
        },

        examples: {
          nodeJs: `
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook event
  console.log('Received event:', event, req.body);
  
  res.status(200).send('OK');
});
          `,
          
          python: `
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    event = request.headers.get('X-Webhook-Event')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, webhook_secret):
        return 'Invalid signature', 401
    
    # Process webhook event
    data = request.get_json()
    print(f'Received event: {event}', data)
    
    return 'OK', 200
          `,
        },

        bestPractices: [
          'Always verify webhook signatures',
          'Respond with 2xx status codes for successful processing',
          'Implement idempotency to handle duplicate deliveries',
          'Use HTTPS endpoints for security',
          'Handle webhook failures gracefully',
          'Log webhook events for debugging',
          'Implement proper error handling and timeouts',
        ],
      },
    };
  }
}