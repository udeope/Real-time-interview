import {
  Controller,
  Get,
  Put,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Middleware to verify admin access for all routes
  async verifyAdmin(req: any): Promise<void> {
    await this.adminService.verifyAdminAccess(req.user.id);
  }

  @Get('stats')
  async getAdminStats(@Request() req) {
    await this.verifyAdmin(req);
    return this.adminService.getAdminStats();
  }

  @Get('users')
  async getAllUsers(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('search') search?: string,
    @Query('subscriptionTier') subscriptionTier?: SubscriptionTier,
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getAllUsers(page, limit, search, subscriptionTier);
  }

  @Get('users/:userId')
  async getUserDetails(@Request() req, @Param('userId') userId: string) {
    await this.verifyAdmin(req);
    return this.adminService.getUserDetails(userId);
  }

  @Get('subscriptions')
  async getAllSubscriptions(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('status') status?: SubscriptionStatus,
    @Query('tier') tier?: SubscriptionTier,
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getAllSubscriptions(page, limit, status, tier);
  }

  @Put('users/:userId/subscription')
  async updateUserSubscription(
    @Request() req,
    @Param('userId') userId: string,
    @Body() body: { tier: SubscriptionTier; status?: SubscriptionStatus },
  ) {
    await this.verifyAdmin(req);
    return this.adminService.updateUserSubscription(userId, body.tier, body.status);
  }

  @Post('users/:userId/suspend')
  async suspendUser(@Request() req, @Param('userId') userId: string) {
    await this.verifyAdmin(req);
    return this.adminService.suspendUser(userId);
  }

  @Post('users/:userId/reactivate')
  async reactivateUser(@Request() req, @Param('userId') userId: string) {
    await this.verifyAdmin(req);
    return this.adminService.reactivateUser(userId);
  }
}