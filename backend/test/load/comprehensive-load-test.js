const { check, sleep } = require('k6');
const http = require('k6/http');
const ws = require('k6/ws');

// Load test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    ws_connecting: ['p(95)<1000'], // WebSocket connection time
    ws_msgs_received: ['rate>10'], // Message rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

// Test data
const testUser = {
  email: `test-${Math.random()}@example.com`,
  password: 'TestPassword123!',
  name: 'Load Test User'
};

export function setup() {
  // Create test users and sessions
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = {
      email: `loadtest-${i}@example.com`,
      password: 'TestPassword123!',
      name: `Load Test User ${i}`
    };
    
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerRes.status === 201) {
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginRes.status === 200) {
        user.token = JSON.parse(loginRes.body).access_token;
        users.push(user);
      }
    }
  }
  
  return { users };
}

export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  if (!user) return;

  const headers = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: API Endpoints Load Testing
  testAPIEndpoints(headers);
  
  // Test 2: WebSocket Connection Load Testing
  testWebSocketConnections(user.token);
  
  // Test 3: Audio Processing Pipeline Load Testing
  testAudioProcessingPipeline(headers);
  
  // Test 4: Database Query Performance
  testDatabaseQueries(headers);
  
  sleep(1);
}

function testAPIEndpoints(headers) {
  const group = 'API Endpoints';
  
  // Test user profile endpoints
  let res = http.get(`${BASE_URL}/user/profile`, { headers });
  check(res, {
    [`${group} - Profile fetch status is 200`]: (r) => r.status === 200,
    [`${group} - Profile fetch time < 500ms`]: (r) => r.timings.duration < 500,
  });

  // Test interview session creation
  const sessionData = {
    jobContext: {
      title: 'Software Engineer',
      company: 'Test Company',
      description: 'Test job description'
    }
  };
  
  res = http.post(`${BASE_URL}/interview-session`, JSON.stringify(sessionData), { headers });
  check(res, {
    [`${group} - Session creation status is 201`]: (r) => r.status === 201,
    [`${group} - Session creation time < 1000ms`]: (r) => r.timings.duration < 1000,
  });

  if (res.status === 201) {
    const sessionId = JSON.parse(res.body).id;
    
    // Test session retrieval
    res = http.get(`${BASE_URL}/interview-session/${sessionId}`, { headers });
    check(res, {
      [`${group} - Session fetch status is 200`]: (r) => r.status === 200,
      [`${group} - Session fetch time < 300ms`]: (r) => r.timings.duration < 300,
    });
  }

  // Test context analysis endpoint
  const contextData = {
    question: 'Tell me about your experience with React',
    userProfile: { seniority: 'mid', skills: ['React', 'JavaScript'] }
  };
  
  res = http.post(`${BASE_URL}/context-analysis/analyze`, JSON.stringify(contextData), { headers });
  check(res, {
    [`${group} - Context analysis status is 200`]: (r) => r.status === 200,
    [`${group} - Context analysis time < 1500ms`]: (r) => r.timings.duration < 1500,
  });

  // Test response generation endpoint
  const responseData = {
    question: 'What are your strengths?',
    context: { type: 'behavioral', category: 'self-assessment' },
    userProfile: { experience: [], skills: [] }
  };
  
  res = http.post(`${BASE_URL}/response-generation/generate`, JSON.stringify(responseData), { headers });
  check(res, {
    [`${group} - Response generation status is 200`]: (r) => r.status === 200,
    [`${group} - Response generation time < 2000ms`]: (r) => r.timings.duration < 2000,
  });
}

function testWebSocketConnections(token) {
  const group = 'WebSocket';
  
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${token}`;
  
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', function open() {
      console.log('WebSocket connection opened');
      
      // Test audio streaming simulation
      const audioData = new Array(1024).fill(0).map(() => Math.random() * 255);
      socket.send(JSON.stringify({
        event: 'audio-chunk',
        data: { audioData, timestamp: Date.now() }
      }));
    });

    socket.on('message', function (message) {
      const data = JSON.parse(message);
      check(data, {
        [`${group} - Message received`]: (d) => d !== null,
      });
    });

    socket.on('close', function close() {
      console.log('WebSocket connection closed');
    });

    // Keep connection alive for testing
    sleep(5);
  });

  check(res, {
    [`${group} - Connection established`]: (r) => r && r.status === 101,
  });
}

function testAudioProcessingPipeline(headers) {
  const group = 'Audio Pipeline';
  
  // Simulate audio chunk processing
  const audioChunk = {
    data: new Array(4096).fill(0).map(() => Math.random() * 255),
    sampleRate: 44100,
    timestamp: Date.now()
  };
  
  let res = http.post(`${BASE_URL}/transcription/process`, JSON.stringify(audioChunk), { headers });
  check(res, {
    [`${group} - Transcription processing status is 200`]: (r) => r.status === 200,
    [`${group} - Transcription processing time < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  // Test batch processing
  const batchData = {
    chunks: Array(5).fill(audioChunk)
  };
  
  res = http.post(`${BASE_URL}/transcription/batch-process`, JSON.stringify(batchData), { headers });
  check(res, {
    [`${group} - Batch processing status is 200`]: (r) => r.status === 200,
    [`${group} - Batch processing time < 5000ms`]: (r) => r.timings.duration < 5000,
  });
}

function testDatabaseQueries(headers) {
  const group = 'Database';
  
  // Test complex queries
  let res = http.get(`${BASE_URL}/analytics/user-sessions?limit=100`, { headers });
  check(res, {
    [`${group} - Complex query status is 200`]: (r) => r.status === 200,
    [`${group} - Complex query time < 1000ms`]: (r) => r.timings.duration < 1000,
  });

  // Test aggregation queries
  res = http.get(`${BASE_URL}/analytics/performance-metrics?period=7d`, { headers });
  check(res, {
    [`${group} - Aggregation query status is 200`]: (r) => r.status === 200,
    [`${group} - Aggregation query time < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  // Test search queries
  res = http.get(`${BASE_URL}/search/interactions?q=react&limit=50`, { headers });
  check(res, {
    [`${group} - Search query status is 200`]: (r) => r.status === 200,
    [`${group} - Search query time < 800ms`]: (r) => r.timings.duration < 800,
  });
}

export function teardown(data) {
  // Cleanup test users
  data.users.forEach(user => {
    http.del(`${BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    });
  });
}