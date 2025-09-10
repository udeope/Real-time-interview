import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.databaseService.user.create({
      data: createUserDto,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.databaseService.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null> {
    return this.databaseService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    }) as Promise<(User & { password: string }) | null>;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async delete(id: string): Promise<User> {
    return this.databaseService.user.delete({
      where: { id },
    });
  }

  async findWithProfile(id: string) {
    return this.databaseService.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }
}