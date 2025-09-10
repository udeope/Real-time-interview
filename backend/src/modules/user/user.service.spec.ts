import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    subscriptionTier: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    subscriptionTier: 'free',
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findWithProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      };

      repository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should find user by id successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(result).toEqual({
        ...mockUserResponse,
        name: 'Updated Name',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('1', { name: 'Updated Name' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(mockUser);

      await service.delete('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});