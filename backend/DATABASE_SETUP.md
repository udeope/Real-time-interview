# Database Setup Guide

This guide explains how to set up the database and Redis for the AI Interview Assistant backend.

## Prerequisites

1. **PostgreSQL** (version 12 or higher)
2. **Redis** (version 6 or higher)
3. **Node.js** (version 18 or higher)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the `.env.example` file to `.env` and update the database credentials:

```bash
cp ../.env.example ../.env
```

Update the following variables in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_interview_assistant"
REDIS_URL="redis://localhost:6379"
```

### 3. Database Setup
Run the automated setup script:
```bash
npm run db:setup
```

This script will:
- Generate Prisma client
- Push the database schema
- Seed the database with sample data

### 4. Manual Setup (if needed)

If the automated setup fails, run these commands individually:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database (⚠️ destroys all data) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:setup` | Complete setup (generate + push + seed) |

## Database Schema

The database includes the following main entities:

### Users
- User accounts with subscription tiers
- User profiles with skills, experience, and preferences

### Interview Sessions
- Active and completed interview sessions
- Job context and settings

### Interactions
- Questions and generated responses
- User feedback and selections

### Session Metrics
- Performance metrics (latency, accuracy)
- User satisfaction scores

## Redis Configuration

Redis is used for:
- Session management
- Response caching
- Context caching
- Real-time data

### Cache Keys Structure
- `session:{sessionId}` - User sessions
- `response:{cacheKey}` - Cached responses
- `context:{userId}` - User context data

## Health Checks

The application provides health check endpoints:

- `GET /health` - Overall system health
- `GET /db-info` - Database connection information

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Verify database credentials in `.env`
3. Check if database exists: `createdb ai_interview_assistant`

### Redis Connection Issues
1. Ensure Redis is running: `redis-server`
2. Verify Redis URL in `.env`
3. Test connection: `redis-cli ping`

### Migration Issues
```bash
# Reset and recreate database
npm run db:reset

# Or manually drop and recreate
dropdb ai_interview_assistant
createdb ai_interview_assistant
npm run db:push
```

### Seeding Issues
```bash
# Clear existing data and reseed
npm run db:reset
npm run db:seed
```

## Production Considerations

1. **Environment Variables**: Use secure credentials
2. **Connection Pooling**: Configure appropriate pool sizes
3. **Monitoring**: Enable query logging and metrics
4. **Backups**: Set up automated database backups
5. **SSL**: Enable SSL connections in production

## Development Tools

### Prisma Studio
Launch the database browser:
```bash
npm run db:studio
```

### Database Inspection
```bash
# View database structure
npx prisma db pull

# Generate ERD
npx prisma generate --generator erd
```

## Sample Data

The seed script creates:
- 2 sample users with different profiles
- 2 interview sessions (one completed, one active)
- Sample interactions with questions and responses
- Performance metrics

This data is useful for development and testing.