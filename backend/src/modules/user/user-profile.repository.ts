import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto/user.dto';
import { UserProfile, Prisma } from '@prisma/client';

@Injectable()
export class UserProfileRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(userId: string, createUserProfileDto: CreateUserProfileDto): Promise<UserProfile> {
    const data: Prisma.UserProfileCreateInput = {
      user: { connect: { id: userId } },
      seniority: createUserProfileDto.seniority,
      industries: createUserProfileDto.industries as unknown as Prisma.JsonArray,
      skills: createUserProfileDto.skills as unknown as Prisma.JsonArray,
      experience: createUserProfileDto.experience as unknown as Prisma.JsonArray,
      preferences: createUserProfileDto.preferences as unknown as Prisma.JsonObject,
    };

    return this.databaseService.userProfile.create({ data });
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.databaseService.userProfile.findUnique({
      where: { userId },
    });
  }

  async update(userId: string, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfile> {
    const data: Prisma.UserProfileUpdateInput = {
      seniority: updateUserProfileDto.seniority,
      industries: updateUserProfileDto.industries as unknown as Prisma.JsonArray,
      skills: updateUserProfileDto.skills as unknown as Prisma.JsonArray,
      experience: updateUserProfileDto.experience as unknown as Prisma.JsonArray,
      preferences: updateUserProfileDto.preferences as unknown as Prisma.JsonObject,
    };

    return this.databaseService.userProfile.update({
      where: { userId },
      data,
    });
  }

  async delete(userId: string): Promise<UserProfile> {
    return this.databaseService.userProfile.delete({
      where: { userId },
    });
  }

  async upsert(userId: string, profileData: CreateUserProfileDto): Promise<UserProfile> {
    const updateData: Prisma.UserProfileUpdateInput = {
      seniority: profileData.seniority,
      industries: profileData.industries as unknown as Prisma.JsonArray,
      skills: profileData.skills as unknown as Prisma.JsonArray,
      experience: profileData.experience as unknown as Prisma.JsonArray,
      preferences: profileData.preferences as unknown as Prisma.JsonObject,
    };

    const createData: Prisma.UserProfileCreateInput = {
      user: { connect: { id: userId } },
      seniority: profileData.seniority,
      industries: profileData.industries as unknown as Prisma.JsonArray,
      skills: profileData.skills as unknown as Prisma.JsonArray,
      experience: profileData.experience as unknown as Prisma.JsonArray,
      preferences: profileData.preferences as unknown as Prisma.JsonObject,
    };

    return this.databaseService.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });
  }
}