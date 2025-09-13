import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from './user-profile.repository';
import { UserPreferencesService } from './services/user-preferences.service';
import { AccountDeletionService } from './services/account-deletion.service';
import { DatabaseService } from '../../config/database.config';
import { SecurityModule } from '../security/security.module';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserProfileService,
    UserProfileRepository,
    UserPreferencesService,
    AccountDeletionService,
    DatabaseService,
  ],
  exports: [
    UserService, 
    UserProfileService, 
    UserPreferencesService,
    AccountDeletionService,
  ],
})
export class UserModule {}