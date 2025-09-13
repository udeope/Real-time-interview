# Agent Instructions

This document outlines the key commands, coding conventions, and project structure for this repository.

## Project Structure

This is a monorepo with two main packages:
- `frontend`: A Next.js application.
- `backend`: A NestJS application.

All commands should be run from the root directory unless otherwise specified.

## Build, Lint, and Test

- **Build:** `npm run build` (builds both `frontend` and `backend`)
- **Lint:** `npm run lint` (lints both `frontend` and `backend`)
- **Test:** `npm run test` (tests both `frontend` and `backend`)
- **Run a single test:**
  - Backend (Jest): `npm run test --workspace=backend -- <path_to_test_file>`
  - Frontend (Vitest): `npm run test --workspace=frontend -- <path_to_test_file>`

## Code Style

- **Formatting:** This project uses Prettier. Run `npm run format` to format the code.
- **Imports:** Organize imports alphabetically. Use aliases defined in `tsconfig.json`.
- **Types:** Use TypeScript. Avoid `any` where possible.
- **Naming Conventions:**
  - Use camelCase for variables and functions.
  - Use PascalCase for classes, interfaces, and React components.
- **Error Handling:** Use try/catch for async operations. Throw custom error classes for specific errors.
- **General:** Adhere to the rules in `.eslintrc.js` and `.prettierrc` in both `frontend` and `backend`.

## CI/CD Pipeline

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml` and includes the following stages:
1.  **Testing:** Runs linting, type-checking, unit tests, and component tests for both `frontend` and `backend`.
2.  **E2E Tests:** Runs Playwright E2E tests.
3.  **Security Scan:** Scans the codebase for vulnerabilities using Trivy.
4.  **Build and Push:** Builds and pushes Docker images to GHCR for `frontend` and `backend`.
5.  **Deployment:** Deploys to staging and production environments (on push to `main`).

## Scripts

The `scripts` directory contains the following useful scripts:
- `backup-system.sh`: Creates a backup of the system.
- `deploy-production.sh`: Deploys the application to production.
- `run-performance-optimization.ps1`: Runs performance optimization tasks.
- `secrets-management.sh`: Manages application secrets.

## Documentation

The `docs` directory contains the following important documents:
- `DEPLOYMENT_GUIDE.md`: Instructions for deploying the application.
- `DISASTER_RECOVERY.md`: Plan for disaster recovery.
- `PRODUCTION_CHECKLIST.md`: Checklist for production deployments.
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md`: Summary of performance optimization efforts.
- `README.md`: General information about the project.

## Database

The database schema is managed with Prisma and is defined in `backend/prisma/schema.prisma`.
- **Database:** PostgreSQL
- **Prisma Commands:**
  - `npm run db:generate --workspace=backend`: Generate Prisma client.
  - `npm run db:migrate --workspace=backend`: Run database migrations.
  - `npm run db:studio --workspace=backend`: Open Prisma Studio.

## Key Dependencies

- **Frontend:**
  - Framework: Next.js
  - UI: React, Tailwind CSS
  - State Management: Zustand
  - Testing: Vitest, Playwright
- **Backend:**
  - Framework: NestJS
  - Database: Prisma, PostgreSQL
  - API: REST, WebSockets
  - Testing: Jest

## Secrets

The required environment variables are defined in the `.env.example` files in the root and `backend` directories. These include:
- Database and Redis connection strings
- API keys for OpenAI and Google Cloud
- JWT secret for authentication
- Client IDs and secrets for external integrations (LinkedIn, Google Calendar, etc.)
- Stripe API keys for subscription management

## Monitoring

The monitoring stack is defined in the `monitoring` directory and can be run with `docker-compose -f monitoring/docker-compose.monitoring.yml up`. It includes:
- **Prometheus:** for metrics collection
- **Grafana:** for visualization
- **Alertmanager:** for alerting
- **ELK Stack (Elasticsearch, Logstash, Kibana):** for centralized logging

## Deployment

The application is deployed using Docker and Kubernetes.
- **Docker:** The `docker-compose.prod.yml` file defines the production services, including the frontend, backend, database, and redis.
- **Kubernetes:** The `k8s/production` directory contains the Kubernetes deployment files for the production environment.

## API Documentation

The `backend` directory contains the following important API documents:
- `API_DOCUMENTATION.md`: General information about the API.
- `CONTEXT_ANALYSIS_SERVICE.md`: Documentation for the context analysis service.
- `INTERVIEW_SESSION_API.md`: Documentation for the interview session API.
- `RESPONSE_GENERATION_SERVICE.md`: Documentation for the response generation service.
- `TRANSCRIPTION_SERVICE.md`: Documentation for the transcription service.
- `WEBSOCKET_DOCUMENTATION.md`: Documentation for the WebSocket API.

## Design and Requirements

The `.kiro/specs/ai-interview-assistant` directory contains the following important documents:
- `design.md`: The design of the application.
- `requirements.md`: The requirements of the application.
- `tasks.md`: The tasks of the application.

## Performance

Performance tests are located in the `frontend/src/test/performance` and `backend/test/performance` directories.
- **Frontend:** Component performance tests are run with Vitest.
- **Backend:** Latency benchmarks are run with Jest.
- **Load Testing:** The `backend` directory contains a `test:load` script that can be used to run load tests with k6.

## Security

The `backend/src/modules/security` and `backend/src/modules/auth` directories contain the security and authentication logic.
- **Authentication:** JWT-based authentication is used for both REST and WebSocket APIs.
- **Authorization:** Guards are used to protect routes and endpoints.
- **Vulnerability Scanning:** The CI/CD pipeline includes a security scan using Trivy.

## Testing

The `frontend/src/test` and `backend/test` directories contain the tests for the application.
- **Frontend:**
  - **Unit and Component Tests:** Vitest
  - **E2E Tests:** Playwright
  - **Cross-browser Tests:** Playwright
- **Backend:**
  - **Unit Tests:** Jest
  - **Integration Tests:** Jest
  - **E2E Tests:** Jest
  - **Load Tests:** k6

## Modules

The `backend/src/modules` directory contains the following key modules:
- **admin:** Admin panel functionality.
- **ai-optimization:** AI model optimization.
- **auth:** Authentication and authorization.
- **cache:** Caching services.
- **context-analysis:** Context analysis services.
- **interview-session:** Interview session management.
- **monitoring:** Monitoring and analytics.
- **practice:** Practice session management.
- **response-generation:** Response generation services.
- **security:** Security and privacy features.
- **subscription:** Subscription management.
- **transcription:** Transcription services.
- **user:** User management.
- **websocket:** WebSocket services.
