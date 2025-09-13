import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/modules/database/database.service';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let databaseService: DatabaseService;
  let clientSocket: ClientSocket;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);

    await app.init();
    await app.listen(0); // Use random port for testing

    // Create test user
    testUser = await databaseService.user.create({
      data: {
        email: 'websocket-test@example.com',
        name: 'WebSocket Test User',
        passwordHash: 'hashed-password',
        subscriptionTier: 'free',
      },
    });

    // Generate auth token
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
    });
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUser) {
      await databaseService.user.delete({
        where: { id: testUser.id },
      });
    }

    if (clientSocket) {
      clientSocket.disconnect();
    }

    await app.close();
  });

  beforeEach(() => {
    const serverAddress = app.getHttpServer().listen().address();
    const port = typeof serverAddress === 'string' ? 3001 : serverAddress?.port || 3001;
    
    clientSocket = io(`http://localhost:${port}/interview`, {
      auth: {
        token: authToken,
      },
      transports: ['websocket'],
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect successfully with valid token', (done) => {
      clientSocket.on('connection:success', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.message).toBe('Connected successfully');
        done();
      });

      clientSocket.on('connection:error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject connection with invalid token', (done) => {
      clientSocket.disconnect();
      
      const invalidSocket = io(`http://localhost:3001/interview`, {
        auth: {
          token: 'invalid-token',
        },
        transports: ['websocket'],
      });

      invalidSocket.on('connection:error', (error) => {
        expect(error.message).toBe('Authentication failed');
        invalidSocket.disconnect();
        done();
      });

      invalidSocket.on('connection:success', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });
  });

  describe('Session Management', () => {
    beforeEach((done) => {
      clientSocket.on('connection:success', () => {
        done();
      });
    });

    it('should join and leave session successfully', (done) => {
      const sessionId = 'test-session-123';
      let joinReceived = false;

      clientSocket.on('session:joined', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.stats).toBeDefined();
        joinReceived = true;
        
        // Now leave the session
        clientSocket.emit('session:leave');
      });

      clientSocket.on('session:left', (data) => {
        expect(joinReceived).toBe(true);
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      clientSocket.on('session:error', (error) => {
        done(new Error(`Session error: ${error.message}`));
      });

      // Join session
      clientSocket.emit('session:join', { sessionId });
    });

    it('should handle multiple users in same session', (done) => {
      const sessionId = 'multi-user-session';
      
      // Create second client
      const secondSocket = io(`http://localhost:3001/interview`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      let firstUserJoined = false;
      let secondUserJoined = false;

      clientSocket.on('session:joined', () => {
        firstUserJoined = true;
        // Second user joins after first
        secondSocket.emit('session:join', { sessionId });
      });

      clientSocket.on('user:joined', (data) => {
        expect(data.userId).toBe(testUser.id);
        secondUserJoined = true;
        
        // Clean up
        secondSocket.disconnect();
        
        if (firstUserJoined && secondUserJoined) {
          done();
        }
      });

      secondSocket.on('connection:success', () => {
        // First user joins
        clientSocket.emit('session:join', { sessionId });
      });

      secondSocket.on('session:error', (error) => {
        secondSocket.disconnect();
        done(new Error(`Second socket error: ${error.message}`));
      });
    });
  });

  describe('Audio Streaming', () => {
    const sessionId = 'audio-test-session';

    beforeEach((done) => {
      clientSocket.on('connection:success', () => {
        clientSocket.emit('session:join', { sessionId });
      });

      clientSocket.on('session:joined', () => {
        done();
      });
    });

    it('should handle audio stream events', (done) => {
      const audioData = {
        audioData: 'base64-encoded-audio-data',
        format: 'webm',
        sampleRate: 44100,
        timestamp: new Date().toISOString(),
      };

      // Create second client to receive audio
      const receiverSocket = io(`http://localhost:3001/interview`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      receiverSocket.on('connection:success', () => {
        receiverSocket.emit('session:join', { sessionId });
      });

      receiverSocket.on('audio:received', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.audioData).toBe(audioData.audioData);
        expect(data.format).toBe(audioData.format);
        expect(data.sampleRate).toBe(audioData.sampleRate);
        
        receiverSocket.disconnect();
        done();
      });

      receiverSocket.on('session:joined', () => {
        // Send audio from first client
        clientSocket.emit('audio:stream', audioData);
      });
    });

    it('should handle transcription requests', (done) => {
      const audioData = {
        audioData: 'base64-encoded-audio-data',
        requestId: 'test-request-123',
        format: 'webm',
      };

      clientSocket.on('transcription:processing', (data) => {
        expect(data.requestId).toBe(audioData.requestId);
        expect(data.status).toBe('processing');
        done();
      });

      clientSocket.emit('transcription:request', audioData);
    });
  });

  describe('Real-time Transcription', () => {
    const sessionId = 'realtime-transcription-session';

    beforeEach((done) => {
      clientSocket.on('connection:success', () => {
        clientSocket.emit('session:join', { sessionId });
      });

      clientSocket.on('session:joined', () => {
        done();
      });
    });

    it('should start and stop real-time transcription', (done) => {
      let transcriptionStarted = false;

      clientSocket.on('transcription:started', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.userId).toBe(testUser.id);
        transcriptionStarted = true;
        
        // Stop transcription
        clientSocket.emit('transcription:stop');
      });

      clientSocket.on('transcription:stopped', (data) => {
        expect(transcriptionStarted).toBe(true);
        expect(data.sessionId).toBe(sessionId);
        expect(data.userId).toBe(testUser.id);
        done();
      });

      clientSocket.on('transcription:error', (error) => {
        done(new Error(`Transcription error: ${error.message}`));
      });

      // Start real-time transcription
      clientSocket.emit('transcription:start', {
        language: 'en-US',
        enableSpeakerDiarization: true,
      });
    });

    it('should receive transcription results during real-time session', (done) => {
      let transcriptionStarted = false;
      let resultReceived = false;

      clientSocket.on('transcription:started', () => {
        transcriptionStarted = true;
        
        // Send audio data to trigger transcription
        const audioData = {
          audioData: Buffer.from('mock-audio-data').toString('base64'),
          format: 'webm',
          sampleRate: 16000,
          channels: 1,
        };
        
        clientSocket.emit('audio:stream', audioData);
      });

      clientSocket.on('transcription:result', (result) => {
        expect(transcriptionStarted).toBe(true);
        expect(result.sessionId).toBe(sessionId);
        expect(result.text).toBeDefined();
        expect(result.confidence).toBeDefined();
        expect(result.metadata.processingMode).toBe('realtime');
        
        resultReceived = true;
        
        // Stop transcription
        clientSocket.emit('transcription:stop');
      });

      clientSocket.on('transcription:stopped', () => {
        if (transcriptionStarted && resultReceived) {
          done();
        }
      });

      clientSocket.on('transcription:error', (error) => {
        done(new Error(`Transcription error: ${error.message}`));
      });

      // Start real-time transcription
      clientSocket.emit('transcription:start');
    });

    it('should handle multiple clients receiving same transcription results', (done) => {
      // Create second client
      const secondSocket = io(`http://localhost:3001/interview`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      let firstClientResult = false;
      let secondClientResult = false;

      secondSocket.on('connection:success', () => {
        secondSocket.emit('session:join', { sessionId });
      });

      secondSocket.on('session:joined', () => {
        // Start transcription from first client
        clientSocket.emit('transcription:start');
      });

      clientSocket.on('transcription:result', (result) => {
        expect(result.sessionId).toBe(sessionId);
        firstClientResult = true;
        
        if (firstClientResult && secondClientResult) {
          secondSocket.disconnect();
          clientSocket.emit('transcription:stop');
          done();
        }
      });

      secondSocket.on('transcription:result', (result) => {
        expect(result.sessionId).toBe(sessionId);
        secondClientResult = true;
        
        if (firstClientResult && secondClientResult) {
          secondSocket.disconnect();
          clientSocket.emit('transcription:stop');
          done();
        }
      });

      clientSocket.on('transcription:started', () => {
        // Send audio to trigger transcription
        const audioData = {
          audioData: Buffer.from('test-audio-for-multiple-clients').toString('base64'),
          format: 'webm',
        };
        
        clientSocket.emit('audio:stream', audioData);
      });
    });

    it('should handle transcription errors gracefully', (done) => {
      clientSocket.on('transcription:started', () => {
        // Send invalid audio data to trigger error
        const invalidAudioData = {
          audioData: 'invalid-base64-data',
          format: 'invalid-format',
        };
        
        clientSocket.emit('audio:stream', invalidAudioData);
      });

      clientSocket.on('transcription:processing:error', (error) => {
        expect(error.sessionId).toBe(sessionId);
        expect(error.error).toBeDefined();
        done();
      });

      // Start transcription
      clientSocket.emit('transcription:start');
    });
  });

  describe('Session Status Updates', () => {
    const sessionId = 'status-test-session';

    beforeEach((done) => {
      clientSocket.on('connection:success', () => {
        clientSocket.emit('session:join', { sessionId });
      });

      clientSocket.on('session:joined', () => {
        done();
      });
    });

    it('should broadcast status updates to session members', (done) => {
      const statusUpdate = {
        status: 'recording' as const,
        message: 'Test status update',
      };

      clientSocket.on('session:status:updated', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.status).toBe(statusUpdate.status);
        done();
      });

      clientSocket.emit('session:status', statusUpdate);
    });
  });

  describe('Error Handling', () => {
    beforeEach((done) => {
      clientSocket.on('connection:success', () => {
        done();
      });
    });

    it('should handle audio streaming without session', (done) => {
      const audioData = {
        audioData: 'base64-encoded-audio-data',
      };

      clientSocket.on('audio:error', (error) => {
        expect(error.message).toBe('Not connected to any session');
        done();
      });

      clientSocket.emit('audio:stream', audioData);
    });

    it('should handle transcription request without session', (done) => {
      const audioData = {
        audioData: 'base64-encoded-audio-data',
      };

      clientSocket.on('transcription:error', (error) => {
        expect(error.message).toBe('Not connected to any session');
        done();
      });

      clientSocket.emit('transcription:request', audioData);
    });

    it('should handle status update without session', (done) => {
      const statusUpdate = {
        status: 'active' as const,
      };

      clientSocket.on('session:error', (error) => {
        expect(error.message).toBe('Not connected to any session');
        done();
      });

      clientSocket.emit('session:status', statusUpdate);
    });
  });
});