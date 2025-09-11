# AI Interview Assistant - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AI Interview Assistant to production environments. The application uses a containerized microservices architecture with Docker and can be deployed on various platforms including AWS, GCP, Azure, or on-premises infrastructure.

## Prerequisites

### System Requirements

- **CPU**: Minimum 4 cores, Recommended 8+ cores
- **Memory**: Minimum 8GB RAM, Recommended 16GB+ RAM
- **Storage**: Minimum 100GB SSD, Recommended 500GB+ SSD
- **Network**: Stable internet connection with sufficient bandwidth for real-time audio processing

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- PostgreSQL 15+
- Redis 7+
- Nginx (for load balancing)

### Required Accounts and API Keys

- Google Cloud Platform (for Speech-to-Text API)
- OpenAI (for GPT-4 API)
- AWS (for file storage and backups)
- LinkedIn Developer (for profile integration)
- Monitoring services (Sentry, Grafana Cloud, etc.)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-interview-assistant.git
cd ai-interview-assistant
```

### 2. Environment Configuration

Copy the production environment template:

```bash
cp .env.production .env
```

Edit `.env` file with your production values:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@postgres:5432/ai_interview_prod
POSTGRES_DB=ai_interview_prod
POSTGRES_USER=ai_interview_user
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://redis:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# API Keys
GOOGLE_STT_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
WHISPER_API_KEY=your_whisper_api_key

# Frontend URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com

# Security
CORS_ORIGIN=https://yourdomain.com
```

### 3. SSL Certificate Setup

For HTTPS support, place your SSL certificates in the `nginx/ssl/` directory:

```bash
mkdir -p nginx/ssl
# Copy your certificate files
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

## Deployment Methods

### Method 1: Docker Compose (Recommended for Single Server)

1. **Build and start services:**

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

2. **Initialize database:**

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

3. **Verify deployment:**

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Method 2: Kubernetes (Recommended for Scalable Production)

1. **Create namespace:**

```bash
kubectl create namespace ai-interview-prod
```

2. **Deploy secrets:**

```bash
# Use the secrets management script
./scripts/secrets-management.sh production deploy
```

3. **Deploy application:**

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/production/ -n ai-interview-prod
```

4. **Verify deployment:**

```bash
# Check pod status
kubectl get pods -n ai-interview-prod

# Check services
kubectl get services -n ai-interview-prod
```

## Post-Deployment Configuration

### 1. Health Checks

Verify all services are healthy:

```bash
# Frontend health check
curl -f http://your-domain.com/api/health

# Backend health check
curl -f http://your-domain.com/api/health

# Database connectivity
docker-compose -f docker-compose.prod.yml exec backend npx prisma db pull
```

### 2. Monitoring Setup

Start monitoring services:

```bash
# Start monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Access Grafana dashboard
# URL: http://your-domain.com:3001
# Default credentials: admin / (set in environment)
```

### 3. Backup Configuration

Set up automated backups:

```bash
# Make backup script executable
chmod +x scripts/backup-system.sh

# Test backup system
./scripts/backup-system.sh full

# Set up cron job for automated backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup-system.sh full
```

## Security Configuration

### 1. Firewall Rules

Configure firewall to allow only necessary ports:

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow SSH (change port as needed)
ufw allow 22/tcp

# Block all other incoming traffic
ufw --force enable
```

### 2. SSL/TLS Configuration

Ensure HTTPS is properly configured:

1. Update `nginx/nginx.conf` to enable HTTPS server block
2. Configure SSL certificates
3. Set up automatic certificate renewal (Let's Encrypt)

### 3. Database Security

1. Change default PostgreSQL passwords
2. Configure PostgreSQL to accept connections only from application containers
3. Enable database encryption at rest

## Performance Optimization

### 1. Resource Allocation

Adjust Docker resource limits based on your server capacity:

```yaml
# In docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 2. Database Optimization

1. Configure PostgreSQL for production workloads
2. Set up connection pooling
3. Configure appropriate indexes
4. Set up read replicas if needed

### 3. Caching Configuration

1. Configure Redis for optimal performance
2. Set appropriate cache TTL values
3. Monitor cache hit rates

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Configuration:**
   - Configure Nginx for multiple backend instances
   - Set up session affinity for WebSocket connections

2. **Database Scaling:**
   - Set up read replicas
   - Consider database sharding for large datasets

3. **Cache Scaling:**
   - Set up Redis cluster
   - Configure cache partitioning

### Auto-scaling (Kubernetes)

Configure Horizontal Pod Autoscaler:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

1. **Service Won't Start:**
   - Check Docker logs: `docker-compose logs service-name`
   - Verify environment variables
   - Check port conflicts

2. **Database Connection Issues:**
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Verify network connectivity

3. **High Memory Usage:**
   - Monitor with `docker stats`
   - Check for memory leaks in application logs
   - Adjust container memory limits

4. **WebSocket Connection Failures:**
   - Check Nginx WebSocket configuration
   - Verify CORS settings
   - Check firewall rules

### Log Analysis

Access application logs:

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# Database logs
docker-compose -f docker-compose.prod.yml logs -f postgres

# Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Weekly:**
   - Review monitoring dashboards
   - Check backup integrity
   - Update security patches

2. **Monthly:**
   - Rotate secrets and API keys
   - Review and optimize database performance
   - Update dependencies

3. **Quarterly:**
   - Conduct security audits
   - Review and update disaster recovery procedures
   - Performance testing and optimization

### Update Procedures

1. **Application Updates:**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Build new images
   docker-compose -f docker-compose.prod.yml build
   
   # Rolling update
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Database Migrations:**
   ```bash
   # Run migrations
   docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
   ```

## Support and Monitoring

### Monitoring Dashboards

- **Grafana**: http://your-domain.com:3001
- **Prometheus**: http://your-domain.com:9090
- **Kibana**: http://your-domain.com:5601

### Alert Channels

Configure alerts for:
- High error rates
- Performance degradation
- Service outages
- Security incidents

### Support Contacts

- **Technical Lead**: [email]
- **DevOps Team**: [email]
- **On-call Engineer**: [phone/pager]

## Disaster Recovery

See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for detailed disaster recovery procedures.

## Security Incident Response

See [SECURITY_INCIDENT_RESPONSE.md](./SECURITY_INCIDENT_RESPONSE.md) for security incident procedures.