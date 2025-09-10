# Interview Session API Documentation

## Overview

The Interview Session API provides comprehensive management of interview sessions, interactions, and performance metrics for the AI Interview Assistant application.

## Base URL

```
/interview-sessions
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Session Management

#### Create Interview Session

**POST** `/interview-sessions`

Creates a new interview session for the authenticated user.

**Request Body:**
```json
{
  "jobContext": {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Full-stack development role",
    "requirements": ["JavaScript", "React", "Node.js"],
    "interviewType": "technical",
    "seniority": "mid"
  },
  "settings": {
    "transcriptionEnabled": true,
    "responseGeneration": true,
    "confidenceThreshold": 0.8,
    "preferredLanguage": "en",
    "enabledFeatures": ["real-time-transcription", "response-suggestions"]
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "jobContext": { ... },
  "status": "active",
  "settings": { ... },
  "startedAt": "2024-01-01T10:00:00Z",
  "endedAt": null,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

#### Get User Sessions

**GET** `/interview-sessions?limit=10`

Retrieves all sessions for the authenticated user.

**Query Parameters:**
- `limit` (optional): Maximum number of sessions to return

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "jobContext": { ... },
    "status": "active",
    "settings": { ... },
    "startedAt": "2024-01-01T10:00:00Z",
    "endedAt": null,
    "createdAt": "2024-01-01T10:00:00Z"
  }
]
```

#### Get Active Sessions

**GET** `/interview-sessions/active`

Retrieves only active sessions for the authenticated user.

#### Get Session by ID

**GET** `/interview-sessions/:id`

Retrieves a specific session by ID.

#### Get Session with Details

**GET** `/interview-sessions/:id/details`

Retrieves a session with all interactions and metrics included.

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "jobContext": { ... },
  "status": "active",
  "settings": { ... },
  "startedAt": "2024-01-01T10:00:00Z",
  "endedAt": null,
  "createdAt": "2024-01-01T10:00:00Z",
  "interactions": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "question": "Tell me about yourself",
      "questionClassification": {
        "type": "behavioral",
        "category": "introduction",
        "difficulty": "junior",
        "requiresSTAR": false
      },
      "generatedResponses": [...],
      "selectedResponse": "I am a passionate software developer...",
      "userFeedback": 4,
      "timestamp": "2024-01-01T10:05:00Z"
    }
  ],
  "metrics": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "transcriptionLatencyMs": 1200,
      "responseGenerationMs": 800,
      "totalLatencyMs": 2000,
      "transcriptionAccuracy": 0.96,
      "userSatisfaction": 5,
      "createdAt": "2024-01-01T10:05:00Z"
    }
  ]
}
```

#### Update Session

**PUT** `/interview-sessions/:id`

Updates session properties.

**Request Body:**
```json
{
  "status": "paused",
  "jobContext": { ... },
  "settings": { ... }
}
```

#### Session State Management

**PUT** `/interview-sessions/:id/start` - Start/resume session
**PUT** `/interview-sessions/:id/pause` - Pause session
**PUT** `/interview-sessions/:id/complete` - Complete session

#### Delete Session

**DELETE** `/interview-sessions/:id`

Permanently deletes a session and all associated data.

### Interaction Management

#### Create Interaction

**POST** `/interview-sessions/interactions`

Records a new interaction within a session.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "question": "What is your experience with React?",
  "questionClassification": {
    "type": "technical",
    "category": "frontend",
    "difficulty": "mid",
    "requiresSTAR": false
  },
  "generatedResponses": [
    {
      "id": "response-1",
      "content": "I have 3 years of experience with React...",
      "structure": "direct",
      "estimatedDuration": 45,
      "confidence": 0.9,
      "tags": ["experience", "technical"]
    }
  ]
}
```

#### Get Session Interactions

**GET** `/interview-sessions/:id/interactions`

Retrieves all interactions for a specific session.

#### Update Interaction

**PUT** `/interview-sessions/interactions/:interactionId`

Updates interaction with user feedback or selected response.

**Request Body:**
```json
{
  "selectedResponse": "I have 3 years of experience with React...",
  "userFeedback": 5
}
```

### Metrics Management

#### Record Metrics

**POST** `/interview-sessions/metrics`

Records performance metrics for a session.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "transcriptionLatencyMs": 1200,
  "responseGenerationMs": 800,
  "totalLatencyMs": 2000,
  "transcriptionAccuracy": 0.96,
  "userSatisfaction": 5
}
```

#### Get Session Metrics

**GET** `/interview-sessions/:id/metrics`

Retrieves all metrics for a specific session.

### Analytics

#### Get User Analytics

**GET** `/interview-sessions/analytics?startDate=2024-01-01&endDate=2024-01-31`

Retrieves comprehensive analytics for the user.

**Query Parameters:**
- `startDate` (optional): Start date for analytics period
- `endDate` (optional): End date for analytics period

**Response:**
```json
{
  "totalSessions": 25,
  "averageSessionDuration": 45,
  "averageLatency": 1800,
  "averageAccuracy": 0.94,
  "averageSatisfaction": 4.2,
  "mostCommonQuestionTypes": [
    {
      "type": "behavioral",
      "count": 15
    },
    {
      "type": "technical",
      "count": 10
    }
  ],
  "performanceTrends": [
    {
      "date": "2024-01-01",
      "metrics": {
        "latency": 1800,
        "accuracy": 0.95,
        "satisfaction": 4.5
      }
    }
  ]
}
```

## Data Models

### Session Status Values
- `active`: Session is currently running
- `paused`: Session is temporarily paused
- `completed`: Session has been completed

### Question Types
- `technical`: Technical/coding questions
- `behavioral`: Behavioral/soft skill questions
- `situational`: Situational judgment questions
- `cultural`: Company culture fit questions

### Difficulty Levels
- `junior`: Entry-level questions
- `mid`: Mid-level questions
- `senior`: Senior-level questions

### Response Structures
- `STAR`: Situation, Task, Action, Result format
- `direct`: Direct answer format
- `technical`: Technical explanation format

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid status transition from 'completed' to 'active'",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied to this session",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Interview session not found",
  "error": "Not Found"
}
```

## Rate Limiting

All endpoints are subject to rate limiting:
- 100 requests per minute per user
- Burst limit of 10 requests per second

## Usage Examples

### Complete Interview Flow

1. **Create Session**
```bash
curl -X POST /interview-sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jobContext": {"title": "Software Engineer", "company": "Tech Corp"}}'
```

2. **Record Interaction**
```bash
curl -X POST /interview-sessions/interactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "question": "Tell me about yourself"}'
```

3. **Update with User Feedback**
```bash
curl -X PUT /interview-sessions/interactions/:id \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"selectedResponse": "Response text", "userFeedback": 5}'
```

4. **Record Performance Metrics**
```bash
curl -X POST /interview-sessions/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "transcriptionLatencyMs": 1200, "userSatisfaction": 5}'
```

5. **Complete Session**
```bash
curl -X PUT /interview-sessions/:id/complete \
  -H "Authorization: Bearer <token>"
```

## Best Practices

1. **Session Management**
   - Always complete or pause sessions when done
   - Limit active sessions to prevent resource abuse
   - Use meaningful job context for better analytics

2. **Interaction Recording**
   - Record interactions in real-time for best user experience
   - Include question classification for better analytics
   - Provide user feedback to improve the system

3. **Metrics Collection**
   - Record metrics consistently for performance monitoring
   - Include both technical and user satisfaction metrics
   - Use metrics for system optimization

4. **Error Handling**
   - Always check response status codes
   - Implement retry logic for transient failures
   - Handle rate limiting gracefully