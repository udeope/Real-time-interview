import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WebSocketAuthService } from './services/websocket-auth.service';
import { SessionManagerService } from './services/session-manager.service';
import { UserService } from '../user/user.service';
import { Socket } from 'socket.io';

describe('WebSocketAuthService', () => {
  let service: WebSocketAuthService;
  let jwtService: JwtService;
  let userService: UserService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<WebSocketAuthService>(WebSocketAuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateSocket', () => {
    it('should authenticate socket with valid token from auth header', async () => {
      const mockSocket = {
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          query: {},
          auth: {},
        },
      } as unknown as Socket;

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUser = { id: 'user-id', email: 'test@example.com', name: 'Test User' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.authenticateSocket(mockSocket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(userService.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });

    it('should authenticate socket with valid token from query params', async () => {
      const mockSocket = {
        handshake: {
          headers: {},
          query: {
            token: 'valid-token',
          },
          auth: {},
        },
      } as unknown as Socket;

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUser = { id: 'user-id', email: 'test@example.com', name: 'Test User' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.authenticateSocket(mockSocket);

      expect(result).toEqual(mockUser);
    });

    it('should authenticate socket with valid token from auth object', async () => {
      const mockSocket = {
        handshake: {
          headers: {},
          query: {},
          auth: {
            token: 'valid-token',
          },
        },
      } as unknown as Socket;

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockUser = { id: 'user-id', email: 'test@example.com', name: 'Test User' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.authenticateSocket(mockSocket);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const mockSocket = {
        handshake: {
          headers: {},
          query: {},
          auth: {},
        },
      } as unknown as Socket;

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow('Invalid token');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const mockSocket = {
        handshake: {
          headers: {
            authorization: 'Bearer invalid-token',
          },
          query: {},
          auth: {},
        },
      } as unknown as Socket;

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow('Invalid token');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockSocket = {
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          query: {},
          auth: {},
        },
      } as unknown as Socket;

      const mockPayload = { sub: 'user-id', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow('Invalid token');
    });
  });
});

describe('SessionManagerService', () => {
  let service: SessionManagerService;

  const mockSocket = {
    id: 'socket-id',
    join: jest.fn(),
    leave: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionManagerService],
    }).compile();

    service = module.get<SessionManagerService>(SessionManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinSession', () => {
    it('should create new session and add connection', () => {
      const userId = 'user-id';
      const sessionId = 'session-id';

      service.joinSession(mockSocket, userId, sessionId);

      expect(mockSocket.join).toHaveBeenCalledWith(sessionId);
      
      const connections = service.getSessionConnections(sessionId);
      expect(connections).toHaveLength(1);
      expect(connections[0]).toMatchObject({
        socketId: 'socket-id',
        userId,
        sessionId,
      });
    });

    it('should add connection to existing session', () => {
      const userId1 = 'user-id-1';
      const userId2 = 'user-id-2';
      const sessionId = 'session-id';
      const mockSocket2 = { ...mockSocket, id: 'socket-id-2' };

      service.joinSession(mockSocket, userId1, sessionId);
      service.joinSession(mockSocket2, userId2, sessionId);

      const connections = service.getSessionConnections(sessionId);
      expect(connections).toHaveLength(2);
    });
  });

  describe('leaveSession', () => {
    it('should remove connection from session', () => {
      const userId = 'user-id';
      const sessionId = 'session-id';

      service.joinSession(mockSocket, userId, sessionId);
      expect(service.getSessionConnections(sessionId)).toHaveLength(1);

      service.leaveSession(mockSocket);
      expect(service.getSessionConnections(sessionId)).toHaveLength(0);
      expect(mockSocket.leave).toHaveBeenCalledWith(sessionId);
    });

    it('should clean up empty sessions', () => {
      const userId = 'user-id';
      const sessionId = 'session-id';

      service.joinSession(mockSocket, userId, sessionId);
      service.leaveSession(mockSocket);

      const stats = service.getSessionStats(sessionId);
      expect(stats).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('should return correct session statistics', () => {
      const userId1 = 'user-id-1';
      const userId2 = 'user-id-2';
      const sessionId = 'session-id';
      const mockSocket2 = { ...mockSocket, id: 'socket-id-2' };

      service.joinSession(mockSocket, userId1, sessionId);
      service.joinSession(mockSocket2, userId2, sessionId);

      const stats = service.getSessionStats(sessionId);
      expect(stats).toMatchObject({
        sessionId,
        totalConnections: 2,
        uniqueUsers: 2,
      });
    });

    it('should return null for non-existent session', () => {
      const stats = service.getSessionStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('isUserInSession', () => {
    it('should return true when user is in session', () => {
      const userId = 'user-id';
      const sessionId = 'session-id';

      service.joinSession(mockSocket, userId, sessionId);
      
      expect(service.isUserInSession(userId, sessionId)).toBe(true);
    });

    it('should return false when user is not in session', () => {
      expect(service.isUserInSession('user-id', 'session-id')).toBe(false);
    });
  });
});