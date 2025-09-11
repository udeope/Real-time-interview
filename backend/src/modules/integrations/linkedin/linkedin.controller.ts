import { Controller, Get, Post, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LinkedInService } from './linkedin.service';
import { Request } from 'express';

@ApiTags('LinkedIn Integration')
@Controller('integrations/linkedin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinkedInController {
  constructor(private readonly linkedInService: LinkedInService) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get LinkedIn OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  async getAuthUrl(@Req() req: Request) {
    const state = `${req.user.id}_${Date.now()}`;
    const authUrl = await this.linkedInService.getAuthUrl(state);
    
    return {
      authUrl,
      state,
    };
  }

  @Post('callback')
  @ApiOperation({ summary: 'Handle LinkedIn OAuth callback and sync profile' })
  @ApiResponse({ status: 200, description: 'Profile synced successfully' })
  async handleCallback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
  ) {
    const { code, state } = body;
    
    // Verify state contains user ID
    const [userId] = state.split('_');
    if (userId !== req.user.id) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const accessToken = await this.linkedInService.exchangeCodeForToken(code);
    
    // Sync user profile
    await this.linkedInService.syncUserProfile(req.user.id, accessToken);
    
    return {
      message: 'LinkedIn profile synced successfully',
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get LinkedIn profile data' })
  @ApiResponse({ status: 200, description: 'Profile data retrieved successfully' })
  async getProfile(@Query('access_token') accessToken: string) {
    const profile = await this.linkedInService.getProfile(accessToken);
    return profile;
  }

  @Post('sync')
  @ApiOperation({ summary: 'Manually sync LinkedIn profile' })
  @ApiResponse({ status: 200, description: 'Profile synced successfully' })
  async syncProfile(
    @Body() body: { access_token: string },
    @Req() req: Request,
  ) {
    await this.linkedInService.syncUserProfile(req.user.id, body.access_token);
    
    return {
      message: 'Profile synced successfully',
      syncedAt: new Date().toISOString(),
    };
  }
}