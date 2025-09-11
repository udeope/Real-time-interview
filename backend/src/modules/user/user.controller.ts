import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserProfileService } from './user-profile.service';
import { UserPreferencesService } from './services/user-preferences.service';
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
}