# AI Interview Assistant

AI-powered interview assistant with real-time transcription and intelligent response generation.

## Features

- Real-time audio capture and transcription
- Intelligent response generation using AI
- Practice mode for interview preparation
- Multi-platform video conferencing integration
- Secure data handling and privacy protection

## Tech Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Web Audio API

### Backend
- NestJS
- TypeScript
- Socket.IO
- Prisma ORM
- PostgreSQL
- Redis
- OpenAI API
- Google Speech-to-Text

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL
- Redis

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ai-interview-assistant
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

4. Configure your environment variables in the `.env` files

5. Start the development servers
```bash
npm run dev
```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

### Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend

# Build both projects
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format

# Clean all dependencies and builds
npm run clean
```

## Project Structure

```
ai-interview-assistant/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # NestJS backend application
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   ├── common/          # Shared utilities
│   │   ├── config/          # Configuration files
│   │   └── types/           # TypeScript type definitions
│   ├── prisma/              # Database schema and migrations
│   └── package.json
└── package.json             # Root package.json for monorepo
```

## Environment Variables

See `.env.example` files for required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.