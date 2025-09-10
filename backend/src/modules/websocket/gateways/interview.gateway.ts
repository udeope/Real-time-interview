import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketAuthService } from '../services/websocket-auth.service';
import { SessionManagerService } from '../services/session-manager.service';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import {
  JoinSessionDto,
  AudioChunkDto,
  TranscriptionResultDto,
  SessionStatusDto,
  ErrorResponseDto,
} from '../dto/websocket.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/interview',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class InterviewGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InterviewGateway.name);

  constructor(
    private readonly wsAuthService: WebSocketAuthService,
    private readonly sessionManager: SessionManagerService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Set up periodic cleanup of inactive sessions
    setInterval(() => {
      this.sessionManager.cleanupInactiveSessions(30);
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);
      
      // Authenticate the client
      const user = await this.wsAuthService.authenticateSocket(client);
      
      // Store user info in socket data
      client.data.user = user;
      client.data.authenticated = true;
      
      this.logger.log(`Client authenticated: ${client.id} (User: ${user.id})`);
      
      // Send connection success
      client.emit('connection:success', {
        message: 'Connected successfully',
        userId: user.id,
      });
      
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      
      client.emit('connection:error', {
        message: 'Authentication failed',
        error: error.message,
      });
      
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from session if connected
    this.sessionManager.leaveSession(client);
    
    // Notify other clients in the same session about disconnection
    const sessionId = this.sessionManager.getSocketSession(client.id);
    if (sessionId && client.data.user) {
      client.to(sessionId).emit('user:disconnected', {
        userId: client.data.user.id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('session:join')
  @UseGuards(WsAuthGuard)
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinSessionDto,
  ) {
    try {
      const user = client.data.user;
      const { sessionId } = data;
      
      this.logger.log(`User ${user.id} joining session ${sessionId}`);
      
      // Join the session room
      this.sessionManager.joinSession(client, user.id, sessionId);
      
      // Notify other clients in the session
      client.to(sessionId).emit('user:joined', {
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      });
      
      // Send session info to the joining client
      const sessionStats = this.sessionManager.getSessionStats(sessionId);
      client.emit('session:joined', {
        sessionId,
        stats: sessionStats,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.logger.error(`Error joining session: ${error.message}`);
      client.emit('session:error', {
        message: 'Failed to join session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('session:leave')
  @UseGuards(WsAuthGuard)
  async handleLeaveSession(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user;
      const sessionId = this.sessionManager.getSocketSession(client.id);
      
      if (sessionId) {
        this.logger.log(`User ${user.id} leaving session ${sessionId}`);
        
        // Leave the session
        this.sessionManager.leaveSession(client);
        
        // Notify other clients
        client.to(sessionId).emit('user:left', {
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
        
        client.emit('session:left', {
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Error leaving session: ${error.message}`);
      client.emit('session:error', {
        message: 'Failed to leave session',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('audio:stream')
  @UseGuards(WsAuthGuard)
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AudioChunkDto,
  ) {
    try {
      const user = client.data.user;
      const sessionId = this.sessionManager.getSocketSession(client.id);
      
      if (!sessionId) {
        client.emit('audio:error', {
          message: 'Not connected to any session',
        });
        return;
      }
      
      // Broadcast audio chunk to other clients in the session (excluding sender)
      client.to(sessionId).emit('audio:received', {
        userId: user.id,
        audioData: data.audioData,
        timestamp: data.timestamp || new Date().toISOString(),
        format: data.format,
        sampleRate: data.sampleRate,
      });
      
      // TODO: Forward to transcription service
      // This will be implemented in task 7 (transcription service)
      
    } catch (error) {
      this.logger.error(`Error handling audio stream: ${error.message}`);
      client.emit('audio:error', {
        message: 'Failed to process audio',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('transcription:request')
  @UseGuards(WsAuthGuard)
  async handleTranscriptionRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AudioChunkDto,
  ) {
    try {
      const user = client.data.user;
      const sessionId = this.sessionManager.getSocketSession(client.id);
      
      if (!sessionId) {
        client.emit('transcription:error', {
          message: 'Not connected to any session',
        });
        return;
      }
      
      // TODO: Process transcription request
      // This will be implemented in task 7 (transcription service)
      
      // For now, emit a placeholder response
      client.emit('transcription:processing', {
        requestId: data.requestId || Date.now().toString(),
        status: 'processing',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.logger.error(`Error handling transcription request: ${error.message}`);
      client.emit('transcription:error', {
        message: 'Failed to process transcription',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('session:status')
  @UseGuards(WsAuthGuard)
  async handleSessionStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionStatusDto,
  ) {
    try {
      const user = client.data.user;
      const sessionId = this.sessionManager.getSocketSession(client.id);
      
      if (!sessionId) {
        client.emit('session:error', {
          message: 'Not connected to any session',
        });
        return;
      }
      
      // Broadcast status update to all clients in the session
      this.server.to(sessionId).emit('session:status:updated', {
        userId: user.id,
        status: data.status,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.logger.error(`Error handling session status: ${error.message}`);
      client.emit('session:error', {
        message: 'Failed to update session status',
        error: error.message,
      });
    }
  }

  /**
   * Broadcast transcription result to all clients in a session
   */
  broadcastTranscription(sessionId: string, transcription: TranscriptionResultDto) {
    this.server.to(sessionId).emit('transcription:result', transcription);
  }

  /**
   * Broadcast response suggestions to a specific user
   */
  broadcastResponseSuggestions(userId: string, responses: any[]) {
    const userSockets = this.sessionManager.getUserSockets(userId);
    userSockets.forEach(socketId => {
      this.server.to(socketId).emit('responses:suggestions', {
        responses,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Send error to specific session
   */
  sendSessionError(sessionId: string, error: ErrorResponseDto) {
    this.server.to(sessionId).emit('session:error', error);
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string) {
    return this.sessionManager.getSessionStats(sessionId);
  }
}