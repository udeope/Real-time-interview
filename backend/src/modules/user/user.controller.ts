import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Post,
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  Req,
  Query
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UserProfileService } from './user-profile.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { AccountDeletionService } from './services/account-deletion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  UpdateUserDto, 
  UserResponseDto, 
  CreateUserProfileDto, 
  UpdateUserProfileDto, 
  UserProfileResponseDto 
} from './dto/user.dto';
import { UpdateUserPreferencesDto, UserPreferencesResponseDto } from './dto/user-preferences.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly accountDeletionService: AccountDeletionService,
  ) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() user: any): Promise<UserResponseDto> {
    return this.userService.findById(user.id);
  }

  @Put('me')
  async updateCurrentUser(
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(user.id, updateUserDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrentUser(@CurrentUser() user: any): Promise<void> {
    await this.userService.delete(user.id);
  }

  @Get('me/complete')
  async getCurrentUserWithProfile(@CurrentUser() user: any) {
    return this.userService.findWithProfile(user.id);
  }

  // Profile endpoints
  @Get('me/profile')
  async getCurrentUserProfile(@CurrentUser() user: any): Promise<UserProfileResponseDto | null> {
    return this.userProfileService.findByUserId(user.id);
  }

  @Put('me/profile')
  async createOrUpdateProfile(
    @CurrentUser() user: any,
    @Body() profileDto: CreateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.userProfileService.upsert(user.id, profileDto);
  }

  @Delete('me/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@CurrentUser() user: any): Promise<void> {
    await this.userProfileService.delete(user.id);
  }

  // Preferences endpoints
  @Get('me/preferences')
  async getCurrentUserPreferences(@CurrentUser() user: any): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.getUserPreferences(user.id);
  }

  @Put('me/preferences')
  async updateCurrentUserPreferences(
    @CurrentUser() user: any,
    @Body() preferencesDto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.updateUserPreferences(user.id, preferencesDto);
  }

  @Delete('me/preferences')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetUserPreferences(@CurrentUser() user: any): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.resetUserPreferences(user.id);
  }

  // Account deletion endpoints
  @Post('me/delete-account')
  async requestAccountDeletion(
    @CurrentUser() user: any,
    @Body() body: { reason?: string; feedback?: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.accountDeletionService.requestAccountDeletion({
      userId: user.id,
      reason: body.reason,
      feedback: body.feedback,
      ipAddress,
      userAgent,
    });
  }

  @Post('me/schedule-deletion')
  async scheduleAccountDeletion(
    @CurrentUser() user: any,
    @Body() body: { deletionDate: string },
  ) {
    const deletionDate = new Date(body.deletionDate);
    await this.accountDeletionService.scheduleAccountDeletion(user.id, deletionDate);
    return { success: true, message: 'Account deletion scheduled' };
  }

  @Post('me/cancel-deletion')
  async cancelAccountDeletion(@CurrentUser() user: any) {
    await this.accountDeletionService.cancelAccountDeletion(user.id);
    return { success: true, message: 'Account deletion cancelled' };
  }

  // Settings export endpoint
  @Get('me/export-settings')
  async exportUserSettings(@CurrentUser() user: any) {
    const [userInfo, profile, preferences] = await Promise.all([
      this.userService.findById(user.id),
      this.userProfileService.findByUserId(user.id),
      this.userPreferencesService.getUserPreferences(user.id),
    ]);

    return {
      user: userInfo,
      profile,
      preferences,
      exportedAt: new Date(),
    };
  }

  // Preferences statistics (for admin or analytics)
  @Get('preferences/stats')
  async getPreferencesStats(@Query('admin') isAdmin?: string) {
    // In a real app, you'd check admin permissions here
    if (isAdmin === 'true') {
      return this.userPreferencesService.getPreferencesStats();
    }
    throw new Error('Unauthorized');
  }
}