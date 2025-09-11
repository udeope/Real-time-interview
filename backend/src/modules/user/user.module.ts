import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from './user-profile.repository';
import { UserPreferencesService } from './services/user-preferences.service';
import { DatabaseService } from '../../config/database.config';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserProfileService,
    UserProfileRepository,
    UserPreferencesService,
    DatabaseService,
  ],
  exports: [UserService, UserProfileService, UserPreferencesService],
})
export class UserModule {}