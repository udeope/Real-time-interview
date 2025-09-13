# AI Interview Assistant

Plataforma de asistencia inteligente para entrevistas con transcripción en tiempo real, generación de respuestas con IA y análisis contextual avanzado.

## 🚀 Características Principales

### Core Features
- **Transcripción en Tiempo Real**: Captura y transcribe audio usando Google Speech-to-Text y Whisper
- **Generación Inteligente de Respuestas**: Sugerencias contextuales usando OpenAI GPT-4
- **Análisis de Contexto**: Análisis automático de descripciones de trabajo y perfil del usuario
- **Modo Práctica**: Simulación de entrevistas con feedback personalizado
- **WebSocket en Tiempo Real**: Comunicación bidireccional para experiencia fluida

### Integraciones y Productividad
- **Integración con LinkedIn**: Sincronización de perfil profesional
- **Calendario**: Integración con Google Calendar y Outlook
- **Videoconferencias**: Soporte para Zoom, Teams, Meet
- **Exportación de Datos**: Múltiples formatos (PDF, JSON, CSV)
- **Webhooks**: Notificaciones automáticas de eventos

### Seguridad y Privacidad
- **Cumplimiento GDPR**: Gestión completa de consentimientos y derechos
- **Auditoría de Seguridad**: Registro detallado de acciones
- **Detección de Fraude**: Monitoreo de actividad sospechosa
- **Retención de Datos**: Políticas automáticas de limpieza
- **Encriptación**: Datos en tránsito y en reposo

### Monitoreo y Analytics
- **Dashboard de Métricas**: Rendimiento del sistema en tiempo real
- **Análisis de Satisfacción**: Métricas de experiencia del usuario
- **Alertas Inteligentes**: Notificaciones proactivas de problemas
- **Grafana Integration**: Visualización avanzada de métricas

### Gestión de Usuarios
- **Suscripciones**: Planes flexibles con límites personalizables
- **Preferencias Avanzadas**: Configuración granular del usuario
- **Gestión de Cuenta**: Eliminación segura y exportación de datos
- **Historial de Facturación**: Seguimiento completo de pagos

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 con App Router
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Comunicación**: Socket.IO Client, WebSocket API
- **Audio**: Web Audio API, MediaRecorder API
- **Testing**: Playwright (E2E), Jest (Unit), React Testing Library
- **Optimización**: Bundle splitting, CDN optimization, Service Workers

### Backend
- **Framework**: NestJS con arquitectura modular
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Cache**: Redis con estrategias avanzadas
- **Comunicación**: Socket.IO, WebSocket Gateway
- **IA**: OpenAI GPT-4, Google Speech-to-Text, Whisper
- **Monitoreo**: Prometheus, Grafana, Winston Logger
- **Testing**: Jest, Supertest, Artillery (Load Testing)

### Infraestructura
- **Contenedores**: Docker con multi-stage builds
- **Orquestación**: Kubernetes (producción)
- **CI/CD**: GitHub Actions con pipelines automatizados
- **Proxy**: Nginx con configuración optimizada
- **Monitoreo**: Prometheus + Grafana stack
- **Backup**: Estrategias automatizadas de respaldo

### Servicios Externos
- **IA**: OpenAI API, Google Cloud Speech-to-Text
- **Integraciones**: LinkedIn API, Google Calendar, Microsoft Graph
- **Notificaciones**: Webhook system, Email services
- **Almacenamiento**: Cloud storage para archivos de audio

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** 18+ (recomendado 20+)
- **npm** 9+ o **yarn** 1.22+
- **PostgreSQL** 14+
- **Redis** 6+
- **Docker** (opcional, para desarrollo con contenedores)

### Instalación Rápida

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd ai-interview-assistant
```

2. **Configurar variables de entorno**
```bash
# Copiar archivos de ejemplo
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Configurar variables principales en .env
OPENAI_API_KEY=tu_clave_openai
GOOGLE_SPEECH_API_KEY=tu_clave_google
DATABASE_URL=postgresql://usuario:password@localhost:5432/ai_interview
REDIS_URL=redis://localhost:6379
```

3. **Instalación con Docker (Recomendado)**
```bash
# Desarrollo completo con Docker
docker-compose -f docker-compose.dev.yml up -d

# Acceder a:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Grafana: http://localhost:3001/grafana
```

4. **Instalación Manual**
```bash
# Instalar dependencias
npm install

# Configurar base de datos
cd backend
npx prisma migrate dev
npx prisma db seed

# Iniciar servicios
cd ..
npm run dev
```

### Configuración de Producción

```bash
# Despliegue con Docker
docker-compose -f docker-compose.prod.yml up -d

# O usar scripts automatizados
./scripts/deploy-production.sh
```

### 📋 Comandos de Desarrollo

```bash
# Desarrollo
npm run dev                    # Iniciar frontend y backend
npm run dev:frontend          # Solo frontend (puerto 3000)
npm run dev:backend           # Solo backend (puerto 3001)
npm run dev:docker            # Desarrollo con Docker

# Build y Producción
npm run build                 # Build completo
npm run build:frontend        # Build solo frontend
npm run build:backend         # Build solo backend
npm run start:prod            # Iniciar en modo producción

# Testing
npm run test                  # Tests unitarios
npm run test:e2e             # Tests end-to-end
npm run test:load            # Tests de carga
npm run test:coverage        # Cobertura de tests
npm run test:watch           # Tests en modo watch

# Calidad de Código
npm run lint                 # Linting
npm run lint:fix             # Fix automático de linting
npm run format               # Formateo con Prettier
npm run type-check           # Verificación de tipos

# Base de Datos
npm run db:migrate           # Ejecutar migraciones
npm run db:seed              # Poblar con datos de prueba
npm run db:reset             # Reset completo de BD
npm run db:studio            # Abrir Prisma Studio

# Monitoreo y Análisis
npm run monitor:start        # Iniciar stack de monitoreo
npm run analyze:performance  # Análisis de rendimiento
npm run analyze:bundle       # Análisis de bundle size

# Utilidades
npm run clean                # Limpiar builds y node_modules
npm run clean:cache          # Limpiar solo cache
npm run backup:create        # Crear backup del sistema
```

## 📁 Estructura del Proyecto

```
ai-interview-assistant/
├── 📁 frontend/                    # Aplicación Next.js
│   ├── 📁 src/
│   │   ├── 📁 app/                # App Router (páginas)
│   │   │   ├── dashboard/         # Dashboard principal
│   │   │   ├── interview/         # Sesiones de entrevista
│   │   │   ├── practice/          # Modo práctica
│   │   │   ├── integrations/      # Gestión de integraciones
│   │   │   ├── subscription/      # Gestión de suscripciones
│   │   │   └── monitoring/        # Dashboard de monitoreo
│   │   ├── 📁 components/         # Componentes React
│   │   │   ├── audio/            # Captura y procesamiento de audio
│   │   │   ├── auth/             # Autenticación
│   │   │   ├── interview/        # Componentes de entrevista
│   │   │   ├── transcription/    # Transcripción en tiempo real
│   │   │   ├── responses/        # Sugerencias de respuestas
│   │   │   ├── websocket/        # Comunicación WebSocket
│   │   │   ├── integrations/     # Integraciones externas
│   │   │   ├── monitoring/       # Métricas y monitoreo
│   │   │   ├── settings/         # Configuraciones
│   │   │   └── ui/               # Componentes base UI
│   │   ├── 📁 hooks/             # Custom React hooks
│   │   ├── 📁 lib/               # Servicios y utilidades
│   │   ├── 📁 test/              # Tests del frontend
│   │   └── 📁 types/             # Definiciones TypeScript
│   └── 📄 package.json
├── 📁 backend/                     # Aplicación NestJS
│   ├── 📁 src/
│   │   ├── 📁 modules/           # Módulos de funcionalidad
│   │   │   ├── auth/             # Autenticación y autorización
│   │   │   ├── user/             # Gestión de usuarios
│   │   │   ├── interview-session/ # Sesiones de entrevista
│   │   │   ├── transcription/    # Servicio de transcripción
│   │   │   ├── response-generation/ # Generación de respuestas IA
│   │   │   ├── context-analysis/ # Análisis contextual
│   │   │   ├── websocket/        # Gateway WebSocket
│   │   │   ├── practice/         # Modo práctica
│   │   │   ├── integrations/     # Integraciones externas
│   │   │   ├── security/         # Seguridad y privacidad
│   │   │   ├── monitoring/       # Monitoreo y métricas
│   │   │   ├── subscription/     # Gestión de suscripciones
│   │   │   ├── cache/            # Sistema de cache
│   │   │   └── admin/            # Panel administrativo
│   │   ├── 📁 common/            # Utilidades compartidas
│   │   │   ├── errors/           # Manejo de errores
│   │   │   ├── monitoring/       # Monitoreo de salud
│   │   │   ├── retry/            # Sistema de reintentos
│   │   │   └── circuit-breaker/  # Circuit breaker pattern
│   │   ├── 📁 config/            # Configuraciones
│   │   └── 📁 types/             # Tipos TypeScript
│   ├── 📁 prisma/                # Schema y migraciones DB
│   ├── 📁 test/                  # Tests del backend
│   │   ├── unit/                 # Tests unitarios
│   │   ├── integration/          # Tests de integración
│   │   ├── e2e/                  # Tests end-to-end
│   │   └── load/                 # Tests de carga
│   ├── 📁 scripts/               # Scripts de utilidad
│   └── 📄 package.json
├── 📁 docs/                       # Documentación
│   ├── API_DOCUMENTATION.md      # Documentación de API
│   ├── DEPLOYMENT_GUIDE.md       # Guía de despliegue
│   ├── DISASTER_RECOVERY.md      # Plan de recuperación
│   └── PRODUCTION_CHECKLIST.md   # Checklist de producción
├── 📁 scripts/                   # Scripts de automatización
│   ├── deploy-production.sh      # Despliegue a producción
│   ├── backup-system.sh          # Sistema de backups
│   └── run-performance-optimization.ps1
├── 📁 k8s/                       # Configuraciones Kubernetes
├── 📁 monitoring/                # Stack de monitoreo
│   ├── prometheus/               # Configuración Prometheus
│   └── grafana/                  # Dashboards Grafana
├── 📁 nginx/                     # Configuración proxy
├── 📁 .github/                   # GitHub Actions CI/CD
└── 📄 docker-compose.*.yml       # Configuraciones Docker
```

## ⚙️ Variables de Entorno

### Variables Principales (.env)
```bash
# Base de Datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/ai_interview
REDIS_URL=redis://localhost:6379

# APIs de IA
OPENAI_API_KEY=sk-...
GOOGLE_SPEECH_API_KEY=...

# Autenticación
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=7d

# Integraciones
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...

# Monitoreo
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=admin_password
```

### Variables de Frontend (frontend/.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENVIRONMENT=development
```

### Variables de Backend (backend/.env)
```bash
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_MAX=100
CACHE_TTL=3600
```

## 🏗️ Arquitectura del Sistema

### Flujo de Datos Principal
1. **Captura de Audio** → Web Audio API → WebSocket
2. **Transcripción** → Google Speech-to-Text/Whisper → Cache Redis
3. **Análisis de Contexto** → NLP + Job Description → Context Store
4. **Generación de Respuestas** → OpenAI GPT-4 → Response Cache
5. **Entrega en Tiempo Real** → WebSocket → Frontend

### Patrones de Diseño Implementados
- **Circuit Breaker**: Protección contra fallos de servicios externos
- **Retry Pattern**: Reintentos inteligentes con backoff exponencial
- **Cache-Aside**: Estrategia de cache para optimizar rendimiento
- **Observer Pattern**: Notificaciones en tiempo real via WebSocket
- **Repository Pattern**: Abstracción de acceso a datos
- **Factory Pattern**: Creación de servicios de IA dinámicos

## 📊 Monitoreo y Observabilidad

### Métricas Disponibles
- **Rendimiento**: Latencia, throughput, errores por minuto
- **Negocio**: Sesiones activas, precisión de transcripción, satisfacción
- **Infraestructura**: CPU, memoria, conexiones DB, cache hit ratio
- **Seguridad**: Intentos de login, accesos sospechosos, auditoría

### Dashboards
- **Sistema**: http://localhost:3001/grafana (admin/admin_password)
- **Aplicación**: http://localhost:3000/monitoring
- **Prometheus**: http://localhost:9090

## 🧪 Testing

### Estrategia de Testing
```bash
# Tests Unitarios (>90% cobertura)
npm run test:unit

# Tests de Integración
npm run test:integration

# Tests E2E con Playwright
npm run test:e2e

# Tests de Carga con Artillery
npm run test:load

# Tests de Rendimiento
npm run test:performance
```

### Tipos de Tests Implementados
- **Unitarios**: Lógica de negocio, servicios, utilidades
- **Integración**: APIs, base de datos, servicios externos
- **E2E**: Flujos completos de usuario
- **Carga**: Rendimiento bajo estrés
- **Compatibilidad**: Cross-browser, dispositivos móviles

## 🚀 Despliegue

### Entornos Disponibles
- **Desarrollo**: `docker-compose.dev.yml`
- **Staging**: `docker-compose.staging.yml`
- **Producción**: `docker-compose.prod.yml`
- **Testing**: `docker-compose.test.yml`

### CI/CD Pipeline
1. **Commit** → Trigger GitHub Actions
2. **Tests** → Unit, Integration, E2E
3. **Build** → Docker images optimizadas
4. **Security Scan** → Vulnerabilidades y secretos
5. **Deploy** → Staging automático, Producción manual
6. **Monitoring** → Verificación post-deploy

## 🔒 Seguridad y Cumplimiento

### Características de Seguridad
- **GDPR Compliant**: Gestión completa de consentimientos
- **Encriptación**: AES-256 para datos sensibles
- **Auditoría**: Logs detallados de todas las acciones
- **Rate Limiting**: Protección contra ataques DDoS
- **Input Validation**: Sanitización de todas las entradas
- **CORS**: Configuración restrictiva de dominios

### Privacidad de Datos
- **Retención**: Políticas automáticas de limpieza
- **Anonimización**: Datos personales protegidos
- **Exportación**: Derecho a portabilidad de datos
- **Eliminación**: Borrado seguro bajo demanda

## 🤝 Contribución

### Proceso de Desarrollo
1. **Fork** del repositorio
2. **Crear rama** feature/nombre-funcionalidad
3. **Desarrollar** siguiendo las convenciones
4. **Tests** asegurar cobertura >90%
5. **Linting** código limpio y consistente
6. **PR** con descripción detallada
7. **Review** por el equipo
8. **Merge** después de aprobación

### Convenciones de Código
- **Commits**: Conventional Commits (feat:, fix:, docs:)
- **Branches**: feature/, bugfix/, hotfix/
- **TypeScript**: Strict mode habilitado
- **ESLint**: Configuración estricta
- **Prettier**: Formateo automático

### Documentación Requerida
- **API Changes**: Actualizar OpenAPI spec
- **New Features**: Documentar en /docs
- **Breaking Changes**: Migration guide
- **Performance**: Benchmarks antes/después

## 📚 Documentación Adicional

- [📖 API Documentation](backend/API_DOCUMENTATION.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [🔧 Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- [💾 Database Setup](backend/DATABASE_SETUP.md)
- [🔌 WebSocket Documentation](backend/WEBSOCKET_DOCUMENTATION.md)
- [🎯 Performance Optimization](PERFORMANCE_OPTIMIZATION_SUMMARY.md)
- [🔐 Security & Privacy](backend/src/modules/security/README.md)

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ para mejorar las entrevistas técnicas**