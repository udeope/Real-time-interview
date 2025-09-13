#!/usr/bin/env node

/**
 * Simple test script to verify WebSocket transcription integration
 * Run with: node scripts/test-websocket-transcription.js
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const TEST_SESSION_ID = 'test-session-' + Date.now();

// Create test JWT token
const testToken = jwt.sign(
  {
    sub: 'test-user-id',
    email: 'test@example.com',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🚀 Starting WebSocket Transcription Integration Test');
console.log(`📡 Connecting to: ${SERVER_URL}/interview`);
console.log(`🔑 Using session: ${TEST_SESSION_ID}`);

// Create socket connection
const socket = io(`${SERVER_URL}/interview`, {
  auth: {
    token: testToken,
  },
  transports: ['websocket'],
});

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, testFn) {
  testsTotal++;
  console.log(`\n🧪 Running test: ${name}`);
  
  try {
    testFn();
  } catch (error) {
    console.error(`❌ Test failed: ${name}`, error.message);
  }
}

function passTest(name) {
  testsPassed++;
  console.log(`✅ Test passed: ${name}`);
}

// Connection tests
socket.on('connect', () => {
  console.log('🔌 Socket connected');
});

socket.on('connection:success', (data) => {
  passTest('Connection authentication');
  console.log(`👤 Authenticated as user: ${data.userId}`);
  
  // Join session
  socket.emit('session:join', { sessionId: TEST_SESSION_ID });
});

socket.on('connection:error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

// Session tests
socket.on('session:joined', (data) => {
  passTest('Session join');
  console.log(`🏠 Joined session: ${data.sessionId}`);
  
  // Test real-time transcription start
  runTest('Start real-time transcription', () => {
    socket.emit('transcription:start', {
      language: 'en-US',
      enableSpeakerDiarization: true,
    });
  });
});

socket.on('session:error', (error) => {
  console.error('❌ Session error:', error.message);
});

// Transcription tests
socket.on('transcription:started', (data) => {
  passTest('Real-time transcription start');
  console.log(`🎤 Transcription started for session: ${data.sessionId}`);
  
  // Send test audio data
  runTest('Send audio chunk', () => {
    const testAudioData = {
      audioData: Buffer.from('Hello, this is a test audio message').toString('base64'),
      format: 'webm',
      sampleRate: 16000,
      channels: 1,
      timestamp: new Date().toISOString(),
      requestId: 'test-request-' + Date.now(),
    };
    
    socket.emit('audio:stream', testAudioData);
  });
});

socket.on('transcription:result', (result) => {
  passTest('Transcription result received');
  console.log(`📝 Transcription result:`, {
    id: result.id,
    text: result.text,
    confidence: result.confidence,
    isPartial: result.isPartial,
    provider: result.provider,
    processingMode: result.metadata?.processingMode,
  });
  
  // Test individual transcription request
  setTimeout(() => {
    runTest('Individual transcription request', () => {
      const audioData = {
        audioData: Buffer.from('This is a separate transcription request').toString('base64'),
        format: 'webm',
        requestId: 'individual-request-' + Date.now(),
      };
      
      socket.emit('transcription:request', audioData);
    });
  }, 1000);
});

socket.on('transcription:processing', (data) => {
  console.log(`⏳ Processing transcription request: ${data.requestId}`);
});

socket.on('transcription:completed', (data) => {
  passTest('Individual transcription completed');
  console.log(`✅ Transcription completed: ${data.requestId}`);
  
  // Stop real-time transcription after a delay
  setTimeout(() => {
    runTest('Stop real-time transcription', () => {
      socket.emit('transcription:stop');
    });
  }, 2000);
});

socket.on('transcription:stopped', (data) => {
  passTest('Real-time transcription stop');
  console.log(`🛑 Transcription stopped for session: ${data.sessionId}`);
  
  // Run final tests
  setTimeout(() => {
    runFinalTests();
  }, 1000);
});

socket.on('transcription:error', (error) => {
  console.error('❌ Transcription error:', error.message);
});

// Audio streaming tests
socket.on('audio:received', (data) => {
  console.log(`🔊 Audio received from user: ${data.userId}`);
});

socket.on('audio:error', (error) => {
  console.error('❌ Audio error:', error.message);
});

// Error handling
socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

function runFinalTests() {
  console.log('\n🧪 Running final tests...');
  
  // Test session status update
  runTest('Session status update', () => {
    socket.emit('session:status', {
      status: 'completed',
      message: 'Test session completed',
    });
  });
}

socket.on('session:status:updated', (data) => {
  passTest('Session status update');
  console.log(`📊 Session status updated: ${data.status}`);
  
  // Leave session and finish tests
  setTimeout(() => {
    socket.emit('session:leave');
  }, 500);
});

socket.on('session:left', (data) => {
  passTest('Session leave');
  console.log(`👋 Left session: ${data.sessionId}`);
  
  // Print test results
  setTimeout(() => {
    printResults();
    socket.disconnect();
  }, 500);
});

function printResults() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`📝 Tests total: ${testsTotal}`);
  console.log(`📈 Success rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 All tests passed! WebSocket transcription integration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  socket.disconnect();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  socket.disconnect();
  process.exit(1);
});

// Timeout for the entire test
setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  printResults();
  socket.disconnect();
  process.exit(1);
}, 30000); // 30 seconds timeout