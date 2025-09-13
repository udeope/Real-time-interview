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
import { Observable, Subject, from } from 'rxjs';
import { WebSocketAuthService } from '../services/websocket-auth.service';
import { SessionManagerService } from '../services/session-manager.service';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { TranscriptionService } from '../../transcription/transcription.service';
import {
  JoinSessionDto,
  AudioChunkDto,
  TranscriptionResultDto,
  SessionStatusDto,
  ErrorResponseDto,
} from '../dto/websocket.dto';
import { AudioChunkDto as TranscriptionAudioChunkDto } from '../../transcription/dto/transcription.dto';

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
    private readonly transcriptionService: TranscriptionService,
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
    
    // Get session before removing from session manager
    const sessionId = this.sessionManager.getSocketSession(client.id);
    
    // Remove from session if connected
    this.sessionManager.leaveSession(client);
    
    // Notify other clients in the same session about disconnection
    if (sessionId && client.data.user) {
      client.to(sessionId).emit('user:disconnected', {
        userId: client.data.user.id,
        timestamp: new Date().toISOString(),
      });
      
      // Check if this was the last user in the session
      const sessionConnections = this.sessionManager.getSessionConnections(sessionId);
      if (sessionConnections.length === 0) {
        // Stop real-time transcription if no users left
        try {
          this.stopRealTimeTranscription(sessionId);
          this.logger.log(`Stopped real-time transcription for empty session: ${sessionId}`);
        } catch (error) {
          this.logger.error(`Error stopping transcription for empty session ${sessionId}:`, error);
        }
      }
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
      
      // Decode audio data
      const audioBuffer = Buffer.from(data.audioData, 'base64');
      
      // Add to real-time stream if active
      if (this.sessionManager.hasActiveAudioStream(sessionId)) {
        const success = this.sessionManager.addAudioChunkToStream(sessionId, audioBuffer);
        if (!success) {
          this.logger.warn(`Failed to add audio chunk to stream for session ${sessionId}`);
        }
      }
      
      // Broadcast audio chunk to other clients in the session (excluding sender)
      client.to(sessionId).emit('audio:received', {
        userId: user.id,
        audioData: data.audioData,
        timestamp: data.timestamp || new Date().toISOString(),
        format: data.format,
        sampleRate: data.sampleRate,
      });
      
      // Process audio for transcription (fallback for non-streaming mode)
      await this.processAudioForTranscription(client, sessionId, user.id, data);
      
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
      
      // Process audio chunk for transcription
      await this.processAudioForTranscription(client, sessionId, user.id, data);
      
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

  @SubscribeMessage('transcription:start')
  @UseGuards(WsAuthGuard)
  async handleStartTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() config?: any,
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
      
      // Start real-time transcription for the session
      await this.startRealTimeTranscription(sessionId, config);
      
      // Notify all clients in the session
      this.server.to(sessionId).emit('transcription:started', {
        sessionId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Real-time transcription started for session ${sessionId} by user ${user.id}`);
      
    } catch (error) {
      this.logger.error(`Error starting transcription: ${error.message}`);
      client.emit('transcription:error', {
        message: 'Failed to start transcription',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('transcription:stop')
  @UseGuards(WsAuthGuard)
  async handleStopTranscription(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user;
      const sessionId = this.sessionManager.getSocketSession(client.id);
      
      if (!sessionId) {
        client.emit('transcription:error', {
          message: 'Not connected to any session',
        });
        return;
      }
      
      // Stop real-time transcription for the session
      await this.stopRealTimeTranscription(sessionId);
      
      // Notify all clients in the session
      this.server.to(sessionId).emit('transcription:stopped', {
        sessionId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Real-time transcription stopped for session ${sessionId} by user ${user.id}`);
      
    } catch (error) {
      this.logger.error(`Error stopping transcription: ${error.message}`);
      client.emit('transcription:error', {
        message: 'Failed to stop transcription',
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

  /**
   * Process audio chunk for transcription
   */
  private async processAudioForTranscription(
    client: Socket,
    sessionId: string,
    userId: string,
    audioData: AudioChunkDto,
  ): Promise<void> {
    const requestId = audioData.requestId || Date.now().toString();
    
    try {
      // Skip processing if real-time stream is active (to avoid duplicate processing)
      if (this.sessionManager.hasActiveAudioStream(sessionId)) {
        this.logger.debug(`Skipping individual chunk processing for session ${sessionId} - real-time stream active`);
        return;
      }

      // Create transcription DTO
      const transcriptionAudioDto: TranscriptionAudioChunkDto = {
        sessionId,
        userId,
        audioData: audioData.audioData,
        format: (audioData.format as any) || 'webm',
        sampleRate: audioData.sampleRate || 16000,
        channels: audioData.channels || 1,
        chunkIndex: audioData.chunkIndex || Date.now(),
        duration: audioData.duration,
        timestamp: audioData.timestamp || new Date().toISOString(),
        config: {
          enableSpeakerDiarization: true,
          enableAutomaticPunctuation: true,
          language: 'en-US',
          provider: 'google', // Default to Google for faster processing
        },
      };

      // Send processing notification
      client.emit('transcription:processing', {
        requestId,
        status: 'processing',
        timestamp: new Date().toISOString(),
      });

      // Process transcription with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transcription timeout')), 10000); // 10 second timeout
      });

      const result = await Promise.race([
        this.transcriptionService.transcribeAudioChunk(transcriptionAudioDto),
        timeoutPromise
      ]) as any;

      // Validate result
      if (!result || !result.text) {
        throw new Error('Invalid transcription result');
      }

      // Broadcast transcription result to all clients in the session
      const transcriptionResult: TranscriptionResultDto = {
        id: result.id,
        sessionId: result.sessionId,
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        timestamp: result.timestamp || new Date().toISOString(),
        speakerId: result.speakerId,
        isPartial: result.isPartial || false,
        audioChunkId: result.audioChunkId,
        provider: result.provider,
        metadata: {
          ...result.metadata,
          processingMode: 'chunk',
          requestId,
        },
      };

      // Broadcast to all clients in the session
      this.broadcastTranscription(sessionId, transcriptionResult);

      // Send success notification to requesting client
      client.emit('transcription:completed', {
        requestId,
        status: 'completed',
        transcriptionId: result.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Transcription completed for session ${sessionId}, chunk ${audioData.chunkIndex}`);

    } catch (error) {
      this.logger.error(`Error processing audio for transcription: ${error.message}`, error.stack);
      
      // Send error to the requesting client
      client.emit('transcription:error', {
        message: 'Failed to process transcription',
        error: error.message,
        requestId,
        timestamp: new Date().toISOString(),
      });

      // Also broadcast error to session for awareness
      this.server.to(sessionId).emit('transcription:processing:error', {
        sessionId,
        userId,
        error: error.message,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start real-time transcription stream for a session
   */
  async startRealTimeTranscription(sessionId: string, config?: any): Promise<void> {
    try {
      this.logger.log(`Starting real-time transcription for session ${sessionId}`);
      
      // Check if already active
      if (this.sessionManager.hasActiveAudioStream(sessionId)) {
        this.logger.warn(`Real-time transcription already active for session ${sessionId}`);
        return;
      }
      
      // Create an audio stream subject
      const audioStreamSubject = new Subject<Buffer>();
      
      // Store the stream for this session
      this.sessionManager.setSessionAudioStream(sessionId, audioStreamSubject);
      
      // Default configuration
      const transcriptionConfig = {
        enableSpeakerDiarization: true,
        enableAutomaticPunctuation: true,
        language: 'en-US',
        provider: 'google', // Use Google for real-time streaming
        sampleRate: 16000,
        channels: 1,
        format: 'webm',
        ...config,
      };
      
      // Start the transcription stream
      const transcriptionStream = this.transcriptionService.transcribeRealTime(
        sessionId,
        audioStreamSubject.asObservable(),
        transcriptionConfig
      );
      
      // Subscribe to transcription results and broadcast them
      const subscription = transcriptionStream.subscribe({
        next: (result) => {
          try {
            const transcriptionResult: TranscriptionResultDto = {
              id: result.id,
              sessionId: result.sessionId,
              text: result.text,
              confidence: result.confidence,
              language: result.language,
              timestamp: result.timestamp || new Date().toISOString(),
              speakerId: result.speakerId,
              isPartial: result.isPartial || false,
              audioChunkId: result.audioChunkId,
              provider: result.provider,
              metadata: {
                ...result.metadata,
                processingMode: 'realtime',
                streamActive: true,
              },
            };
            
            this.broadcastTranscription(sessionId, transcriptionResult);
            
            // Log partial vs final results
            if (result.isPartial) {
              this.logger.debug(`Partial transcription for session ${sessionId}: "${result.text}"`);
            } else {
              this.logger.log(`Final transcription for session ${sessionId}: "${result.text}"`);
            }
          } catch (error) {
            this.logger.error(`Error processing transcription result for session ${sessionId}:`, error);
          }
        },
        error: (error) => {
          this.logger.error(`Real-time transcription error for session ${sessionId}:`, error);
          
          // Clean up the stream
          this.sessionManager.stopSessionAudioStream(sessionId);
          
          // Notify clients
          this.sendSessionError(sessionId, {
            message: 'Real-time transcription failed',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          
          // Try to restart with fallback provider
          setTimeout(async () => {
            try {
              this.logger.log(`Attempting to restart transcription with fallback for session ${sessionId}`);
              await this.startRealTimeTranscription(sessionId, {
                ...transcriptionConfig,
                provider: 'whisper', // Fallback to Whisper
              });
            } catch (fallbackError) {
              this.logger.error(`Fallback transcription also failed for session ${sessionId}:`, fallbackError);
            }
          }, 2000); // Wait 2 seconds before retry
        },
        complete: () => {
          this.logger.log(`Real-time transcription completed for session ${sessionId}`);
          this.sessionManager.stopSessionAudioStream(sessionId);
        },
      });
      
      // Store subscription for cleanup
      audioStreamSubject['subscription'] = subscription;
      
    } catch (error) {
      this.logger.error(`Error starting real-time transcription for session ${sessionId}:`, error);
      
      // Clean up on error
      this.sessionManager.stopSessionAudioStream(sessionId);
      throw error;
    }
  }

  /**
   * Stop real-time transcription stream for a session
   */
  async stopRealTimeTranscription(sessionId: string): Promise<void> {
    try {
      this.logger.log(`Stopping real-time transcription for session ${sessionId}`);
      
      // Get the audio stream
      const audioStream = this.sessionManager.getSessionAudioStream(sessionId);
      
      if (audioStream) {
        // Clean up subscription if exists
        const subscription = audioStream['subscription'];
        if (subscription) {
          subscription.unsubscribe();
        }
        
        // Complete the stream
        audioStream.complete();
      }
      
      // Remove from session manager
      this.sessionManager.stopSessionAudioStream(sessionId);
      
      this.logger.log(`Real-time transcription stopped successfully for session ${sessionId}`);
      
    } catch (error) {
      this.logger.error(`Error stopping real-time transcription for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add audio chunk to the real-time stream
   */
  addAudioChunkToStream(sessionId: string, audioBuffer: Buffer): void {
    try {
      const audioStream = this.sessionManager.getSessionAudioStream(sessionId);
      if (audioStream) {
        audioStream.next(audioBuffer);
      }
    } catch (error) {
      this.logger.error(`Error adding audio chunk to stream for session ${sessionId}:`, error);
    }
  }
}