# AI Interview Assistant API Documentation

## Authentication Endpoints

### Register User
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "name": "User Name",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "subscriptionTier": "free"
    }
  }
  ```

### Login User
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "subscriptionTier": "free"
    }
  }
  ```

## User Management Endpoints

All user endpoints require authentication via Bearer token in the Authorization header.

### Get Current User
- **GET** `/api/users/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "subscriptionTier": "free",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
  ```

### Update Current User
- **PUT** `/api/users/me`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Updated Name"
  }
  ```

### Delete Current User
- **DELETE** `/api/users/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** 204 No Content

### Get User with Profile
- **GET** `/api/users/me/complete`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "subscriptionTier": "free",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "profile": {
      "id": "profile_id",
      "userId": "user_id",
      "seniority": "mid",
      "industries": ["technology", "finance"],
      "skills": [...],
      "experience": [...],
      "preferences": {...},
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

## User Profile Endpoints

### Get User Profile
- **GET** `/api/users/me/profile`
- **Headers:** `Authorization: Bearer <token>`

### Create/Update User Profile
- **PUT** `/api/users/me/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "seniority": "mid",
    "industries": ["technology", "finance"],
    "skills": [
      {
        "name": "JavaScript",
        "level": "advanced",
        "category": "programming"
      }
    ],
    "experience": [
      {
        "company": "Tech Corp",
        "role": "Software Developer",
        "duration": "2 years",
        "achievements": ["Built scalable APIs"],
        "technologies": ["Node.js", "PostgreSQL"]
      }
    ],
    "preferences": {
      "preferredLanguage": "en",
      "timezone": "UTC",
      "notificationSettings": ["email", "push"]
    }
  }
  ```

### Delete User Profile
- **DELETE** `/api/users/me/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** 204 No Content

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Validation error messages"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserProfile
```typescript
interface UserProfile {
  id: string;
  userId: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'lead';
  industries?: string[];
  skills?: Skill[];
  experience?: Experience[];
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

interface Skill {
  name: string;
  level: string;
  category?: string;
}

interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
  technologies: string[];
}

interface UserPreferences {
  preferredLanguage?: string;
  timezone?: string;
  notificationSettings?: string[];
}
```