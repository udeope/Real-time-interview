import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../../auth/dto/auth.dto';

@Injectable()
export class WebSocketAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async authenticateSocket(socket: Socket): Promise<any> {
    try {
      // Extract token from handshake auth or query
      const token = this.extractTokenFromSocket(socket);
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify and decode JWT token
      const payload: JwtPayload = this.jwtService.verify(token);
      
      // Get user from database
      const user = await this.userService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromSocket(socket: Socket): string | null {
    // Try to get token from authorization header
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const tokenFromQuery = socket.handshake.query.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    // Try to get token from auth object
    const tokenFromAuth = socket.handshake.auth?.token;
    if (typeof tokenFromAuth === 'string') {
      return tokenFromAuth;
    }

    return null;
  }
}