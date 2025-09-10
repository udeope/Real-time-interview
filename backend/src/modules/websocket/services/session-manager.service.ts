import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

interface SessionConnection {
  socketId: string;
  userId: string;
  sessionId: string;
  joinedAt: Date;
}

interface SessionRoom {
  sessionId: string;
  connections: Map<string, SessionConnection>;
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessions = new Map<string, SessionRoom>();
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  /**
   * Join a user to a session room
   */
  joinSession(socket: Socket, userId: string, sessionId: string): void {
    const socketId = socket.id;
    
    // Create session room if it doesn't exist
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        connections: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      });
      this.logger.log(`Created new session room: ${sessionId}`);
    }

    const session = this.sessions.get(sessionId)!;
    
    // Add connection to session
    const connection: SessionConnection = {
      socketId,
      userId,
      sessionId,
      joinedAt: new Date(),
    };
    
    session.connections.set(socketId, connection);
    session.lastActivity = new Date();

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Join socket to room
    socket.join(sessionId);
    
    this.logger.log(`User ${userId} joined session ${sessionId} with socket ${socketId}`);
  }

  /**
   * Remove a socket from its session
   */
  leaveSession(socket: Socket): void {
    const socketId = socket.id;
    
    // Find and remove from session
    for (const [sessionId, session] of this.sessions.entries()) {
      const connection = session.connections.get(socketId);
      if (connection) {
        session.connections.delete(socketId);
        session.lastActivity = new Date();
        
        // Remove from user sockets tracking
        const userSockets = this.userSockets.get(connection.userId);
        if (userSockets) {
          userSockets.delete(socketId);
          if (userSockets.size === 0) {
            this.userSockets.delete(connection.userId);
          }
        }
        
        // Leave socket room
        socket.leave(sessionId);
        
        this.logger.log(`Socket ${socketId} left session ${sessionId}`);
        
        // Clean up empty sessions
        if (session.connections.size === 0) {
          this.sessions.delete(sessionId);
          this.logger.log(`Cleaned up empty session: ${sessionId}`);
        }
        
        break;
      }
    }
  }

  /**
   * Get all connections in a session
   */
  getSessionConnections(sessionId: string): SessionConnection[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session.connections.values()) : [];
  }

  /**
   * Get session ID for a socket
   */
  getSocketSession(socketId: string): string | null {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.connections.has(socketId)) {
        return sessionId;
      }
    }
    return null;
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Check if user is in a specific session
   */
  isUserInSession(userId: string, sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    for (const connection of session.connections.values()) {
      if (connection.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const uniqueUsers = new Set(
      Array.from(session.connections.values()).map(c => c.userId)
    ).size;
    
    return {
      sessionId,
      totalConnections: session.connections.size,
      uniqueUsers,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Clean up inactive sessions (called periodically)
   */
  cleanupInactiveSessions(maxInactiveMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff && session.connections.size === 0) {
        this.sessions.delete(sessionId);
        this.logger.log(`Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}