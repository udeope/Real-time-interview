import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const transcriptionLatency = new Trend('transcription_latency');
const responseGenerationLatency = new Trend('response_generation_latency');
const endToEndLatency = new Trend('end_to_end_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
    errors: ['rate<0.05'], // Error rate must be less than 5%
    transcription_latency: ['p(95)<1000'], // 95% of transcriptions under 1s
    response_generation_latency: ['p(95)<1500'], // 95% of responses under 1.5s
    end_to_end_latency: ['p(95)<2000'], // 95% of end-to-end under 2s
  },
};

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

// Test data
const testQuestions = [
  'Tell me about your experience with React',
  'How would you handle a difficult team member?',
  'What is your understanding of microservices?',
  'Describe a challenging project you worked on',
  'How do you stay updated with new technologies?',
];

const userProfiles = [
  {
    experience: [{ company: 'Tech Corp', role: 'Senior Developer', technologies: ['React', 'Node.js'] }],
    seniority: 'senior',
  },
  {
    experience: [{ company: 'Startup Inc', role: 'Full Stack Developer', technologies: ['JavaScript', 'Python'] }],
    seniority: 'mid',
  },
  {
    experience: [{ company: 'Big Corp', role: 'Junior Developer', technologies: ['HTML', 'CSS', 'JavaScript'] }],
    seniority: 'junior',
  },
];

export function setup() {
  // Create test users and get auth tokens
  const users = [];
  
  for (let i = 0; i < 10; i++) {
    const response = http.post(`${BASE_URL}/auth/register`, {
      email: `loadtest${i}@example.com`,
      name: `Load Test User ${i}`,
      password: 'testpassword123',
    });
    
    if (response.status === 201) {
      const loginResponse = http.post(`${BASE_URL}/auth/login`, {
        email: `loadtest${i}@example.com`,
        password: 'testpassword123',
      });
      
      if (loginResponse.status === 200) {
        users.push({
          id: i,
          token: JSON.parse(loginResponse.body).token,
          profile: userProfiles[i % userProfiles.length],
        });
      }
    }
  }
  
  return { users };
}

export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  const headers = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  };

  // Test scenario: Complete interview session
  testCompleteInterviewSession(user, headers);
  
  sleep(1);
}

function testCompleteInterviewSession(user, headers) {
  const startTime = Date.now();
  
  // 1. Create interview session
  const sessionResponse = http.post(`${BASE_URL}/interview-session`, JSON.stringify({
    jobContext: {
      title: 'Software Engineer',
      company: 'Load Test Corp',
      requirements: ['JavaScript', 'React', 'Node.js'],
    },
    settings: {
      transcriptionProvider: 'google',
      responseStyle: 'professional',
    },
  }), { headers });

  const sessionCreated = check(sessionResponse, {
    'session created successfully': (r) => r.status === 201,
  });

  if (!sessionCreated) {
    errorRate.add(1);
    return;
  }

  const sessionId = JSON.parse(sessionResponse.body).id;

  // 2. Test WebSocket connection
  testWebSocketConnection(sessionId, user.token);

  // 3. Process multiple questions
  const question = testQuestions[Math.floor(Math.random() * testQuestions.length)];
  
  // Transcription
  const transcriptionStart = Date.now();
  const transcriptionResponse = http.post(`${BASE_URL}/transcription/process`, JSON.stringify({
    sessionId,
    text: question,
    audioData: 'mock-audio-data',
  }), { headers });

  const transcriptionSuccess = check(transcriptionResponse, {
    'transcription successful': (r) => r.status === 201,
    'transcription has text': (r) => JSON.parse(r.body).text !== undefined,
    'transcription has confidence': (r) => JSON.parse(r.body).confidence > 0.8,
  });

  if (transcriptionSuccess) {
    transcriptionLatency.add(Date.now() - transcriptionStart);
  } else {
    errorRate.add(1);
  }

  // Context Analysis
  const contextResponse = http.post(`${BASE_URL}/context-analysis/analyze`, JSON.stringify({
    sessionId,
    question,
  }), { headers });

  check(contextResponse, {
    'context analysis successful': (r) => r.status === 201,
    'question type identified': (r) => JSON.parse(r.body).questionType !== undefined,
  });

  // Response Generation
  const responseStart = Date.now();
  const responseResponse = http.post(`${BASE_URL}/response-generation/generate`, JSON.stringify({
    sessionId,
    question,
    context: JSON.parse(contextResponse.body),
  }), { headers });

  const responseSuccess = check(responseResponse, {
    'response generation successful': (r) => r.status === 201,
    'responses generated': (r) => JSON.parse(r.body).responses.length > 0,
    'response has content': (r) => JSON.parse(r.body).responses[0].content !== undefined,
  });

  if (responseSuccess) {
    responseGenerationLatency.add(Date.now() - responseStart);
  } else {
    errorRate.add(1);
  }

  // Record interaction
  http.post(`${BASE_URL}/interview-session/interaction`, JSON.stringify({
    sessionId,
    question,
    questionType: JSON.parse(contextResponse.body).questionType,
    responses: JSON.parse(responseResponse.body).responses,
    selectedResponse: JSON.parse(responseResponse.body).responses[0].content,
    userFeedback: Math.floor(Math.random() * 5) + 1,
  }), { headers });

  // Complete session
  http.patch(`${BASE_URL}/interview-session/${sessionId}/complete`, {}, { headers });

  // Record end-to-end latency
  endToEndLatency.add(Date.now() - startTime);
}

function testWebSocketConnection(sessionId, token) {
  const wsUrl = `${WS_URL}/socket.io/?sessionId=${sessionId}&token=${token}`;
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', () => {
      // Join session room
      socket.send(JSON.stringify({
        event: 'join-session',
        data: { sessionId },
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      
      check(message, {
        'websocket message received': () => message !== null,
        'message has event type': () => message.event !== undefined,
      });
    });

    socket.on('error', (e) => {
      errorRate.add(1);
    });

    // Simulate real-time audio streaming
    for (let i = 0; i < 5; i++) {
      socket.send(JSON.stringify({
        event: 'audio-chunk',
        data: {
          sessionId,
          audioData: `chunk-${i}`,
          timestamp: Date.now(),
        },
      }));
      sleep(0.1);
    }

    sleep(2); // Keep connection open for 2 seconds
  });

  check(response, {
    'websocket connection successful': (r) => r && r.status === 101,
  });
}

export function teardown(data) {
  // Clean up test users
  data.users.forEach(user => {
    const headers = {
      'Authorization': `Bearer ${user.token}`,
    };
    
    http.del(`${BASE_URL}/user/profile`, { headers });
  });
}

// Stress test scenario
export function stressTest() {
  const options = {
    stages: [
      { duration: '1m', target: 100 }, // Ramp up to 100 users quickly
      { duration: '3m', target: 100 }, // Stay at 100 users
      { duration: '1m', target: 200 }, // Spike to 200 users
      { duration: '2m', target: 200 }, // Stay at 200 users
      { duration: '1m', target: 0 },   // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'], // More lenient during stress test
      errors: ['rate<0.10'], // Allow higher error rate during stress
    },
  };

  return options;
}

// Spike test scenario
export function spikeTest() {
  const options = {
    stages: [
      { duration: '30s', target: 10 },  // Normal load
      { duration: '30s', target: 500 }, // Sudden spike
      { duration: '1m', target: 500 },  // Stay at spike
      { duration: '30s', target: 10 },  // Return to normal
      { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<10000'], // Very lenient during spike
      errors: ['rate<0.20'], // Allow high error rate during spike
    },
  };

  return options;
}