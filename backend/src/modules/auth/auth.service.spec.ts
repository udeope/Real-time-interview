import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    subscriptionTier: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithPassword = {
    ...mockUser,
    password: 'hashedPassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      userService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      userService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(userService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        name: registerDto.name,
        password: 'hashedPassword',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          subscriptionTier: mockUser.subscriptionTier,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(userService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUserWithPassword.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUserWithPassword.id,
        email: mockUserWithPassword.email,
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: {
          id: mockUserWithPassword.id,
          email: mockUserWithPassword.email,
          name: mockUserWithPassword.name,
          subscriptionTier: mockUserWithPassword.subscriptionTier,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUserWithPassword.password);
    });
  });

  describe('validateUser', () => {
    const payload = { sub: '1', email: 'test@example.com' };

    it('should validate user successfully', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(userService.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findById).toHaveBeenCalledWith(payload.sub);
    });
  });
});