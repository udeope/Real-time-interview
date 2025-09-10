import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create(createUserDto);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Remove password from response
    const { password, ...userResponse } = user as any;
    return userResponse;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    
    // Remove password from response
    const { password, ...userResponse } = updatedUser as any;
    return userResponse;
  }

  async delete(id: string): Promise<void> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
  }

  async findWithProfile(id: string) {
    const user = await this.userRepository.findWithProfile(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Remove password from response
    const { password, ...userResponse } = user as any;
    return userResponse;
  }
}