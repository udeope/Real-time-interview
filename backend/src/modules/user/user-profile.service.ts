import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileRepository } from './user-profile.repository';
import { CreateUserProfileDto, UpdateUserProfileDto, UserProfileResponseDto } from './dto/user.dto';

@Injectable()
export class UserProfileService {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async create(userId: string, createUserProfileDto: CreateUserProfileDto): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileRepository.create(userId, createUserProfileDto);
    return this.mapToResponseDto(profile);
  }

  async findByUserId(userId: string): Promise<UserProfileResponseDto | null> {
    const profile = await this.userProfileRepository.findByUserId(userId);
    return profile ? this.mapToResponseDto(profile) : null;
  }

  async update(userId: string, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfileResponseDto> {
    const existingProfile = await this.userProfileRepository.findByUserId(userId);
    if (!existingProfile) {
      throw new NotFoundException('User profile not found');
    }

    const updatedProfile = await this.userProfileRepository.update(userId, updateUserProfileDto);
    return this.mapToResponseDto(updatedProfile);
  }

  async upsert(userId: string, profileData: CreateUserProfileDto): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileRepository.upsert(userId, profileData);
    return this.mapToResponseDto(profile);
  }

  async delete(userId: string): Promise<void> {
    const existingProfile = await this.userProfileRepository.findByUserId(userId);
    if (!existingProfile) {
      throw new NotFoundException('User profile not found');
    }

    await this.userProfileRepository.delete(userId);
  }

  private mapToResponseDto(profile: any): UserProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      seniority: profile.seniority,
      industries: profile.industries as string[],
      skills: profile.skills as any[],
      experience: profile.experience as any[],
      preferences: profile.preferences as any,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}