import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from './user-profile.repository';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserProfileService,
    UserProfileRepository,
  ],
  exports: [UserService, UserProfileService],
})
export class UserModule {}