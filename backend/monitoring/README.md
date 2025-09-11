# AI Interview Assistant - Monitoring & Analytics System

This directory contains the monitoring and analytics infrastructure for the AI Interview Assistant application.

## Overview

The monitoring system provides comprehensive observability into:
- **Performance Metrics**: Response latency, throughput, and system performance
- **Accuracy Metrics**: Transcription accuracy (WER), confidence scores
- **User Satisfaction**: Ratings, feedback, and NPS scores
- **System Health**: CPU, memory, error rates, and service availability
- **Usage Analytics**: Feature adoption, user engagement, and business metrics

## Architecture

### Components

1. **Backend Services** (`../src/modules/monitoring/`)
   - `MetricsService`: Core metrics collection and storage
   - `AnalyticsService`: User behavior and business intelligence
   - `PerformanceMonitoringService`: Real-time performance tracking
   - `UserSatisfactionService`: Feedback and satisfaction metrics
   - `SystemHealthService`: Health checks and alerting
   - `MonitoringIntegrationService`: Integration with other services

2. **Frontend Dashboard** (`../../frontend/src/components/monitoring/`)
   - Real-time monitoring dashboard
   - Performance visualizations
   - Accuracy tracking
   - User satisfaction metrics
   - System health overview

3. **Infrastructure** (Docker Compose)
   - **Prometheus**: Metrics collection and storage
   - **Grafana**: Visualization and dashboards
   - **AlertManager**: Alert routing and notifications
   - **InfluxDB**: Time-series data storage (optional)

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start the monitoring infrastructure
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### 3. Configure Application

Ensure your application is configured to send metrics:

```typescript
// In your service
constructor(
  private monitoringService: MonitoringIntegrationService
) {}

// Track operations
await this.monitoringService.recordTranscriptionMetrics(
  sessionId,
  userId,
  latency,
  accuracy,
  confidence
);
```

## Metrics Collection

### Performance Metrics

```typescript
interface PerformanceMetrics {
  transcriptionLatency: number;    // Time to transcribe audio
  responseGenerationLatency: number; // Time to generate responses
  totalLatency: number;           // End-to-end latency
  sessionId: string;
  userId: string;
  timestamp: Date;
}
```

**SLA Targets:**
- Total latency: < 2 seconds
- Transcription latency: < 1 second
- Response generation: < 1 second

### Accuracy Metrics

```typescript
interface AccuracyMetrics {
  wordErrorRate: number;          // 0.0 - 1.0 (lower is better)
  confidenceScore: number;        // 0.0 - 1.0 (higher is better)
  transcriptionId: string;
  actualText?: string;           // For validation
  transcribedText: string;
  timestamp: Date;
}
```

**Quality Targets:**
- Word Error Rate: < 5%
- Confidence Score: > 95%

### User Satisfaction

```typescript
interface UserSatisfactionMetrics {
  rating: number;                 // 1-5 scale
  feedback?: string;             // Optional text feedback
  featureUsed: string;           // Which feature was rated
  sessionId: string;
  userId: string;
  timestamp: Date;
}
```

**Satisfaction Targets:**
- Average rating: > 4.0/5
- NPS Score: > 50

## Alerting

### Alert Rules

The system monitors these critical metrics:

1. **High Latency**: Total latency > 2 seconds
2. **Low Accuracy**: WER > 5% or confidence < 95%
3. **System Resources**: CPU > 80%, Memory > 85%
4. **Error Rate**: > 5% error rate
5. **User Satisfaction**: Average rating < 3.5

### Alert Channels

Configure alerts in `alertmanager.yml`:

- **Email**: Send to admin team
- **Slack**: Post to #alerts channel
- **Webhook**: Custom integrations
- **PagerDuty**: For critical alerts

### Example Alert Configuration

```yaml
- name: 'slack-alerts'
  slack_configs:
    - api_url: 'YOUR_SLACK_WEBHOOK_URL'
      channel: '#alerts'
      title: 'AI Interview Assistant Alert'
```

## Dashboard Configuration

### Grafana Dashboards

The system includes pre-configured dashboards:

1. **System Overview**: High-level health and performance
2. **Performance Metrics**: Detailed latency analysis
3. **Accuracy Tracking**: Transcription quality metrics
4. **User Satisfaction**: Ratings and feedback trends
5. **Business Intelligence**: Usage and adoption metrics

### Custom Metrics

Add custom metrics to Prometheus:

```typescript
// In your service
await this.metricsService.recordCustomMetric({
  name: 'custom_feature_usage',
  value: 1,
  labels: { feature: 'new_feature', user_type: 'premium' },
  timestamp: new Date()
});
```

## API Endpoints

### Monitoring API

- `GET /api/monitoring/health` - System health status
- `GET /api/monitoring/performance` - Performance metrics
- `GET /api/monitoring/accuracy` - Accuracy metrics
- `GET /api/monitoring/satisfaction` - User satisfaction
- `GET /api/monitoring/analytics/bi-report` - Business intelligence
- `POST /api/monitoring/feedback` - Record user feedback

### Example Usage

```bash
# Get system health
curl http://localhost:3000/api/monitoring/health

# Get performance metrics for last 24 hours
curl "http://localhost:3000/api/monitoring/performance?start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z"

# Record user feedback
curl -X POST http://localhost:3000/api/monitoring/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "userId": "user-456",
    "rating": 5,
    "featureUsed": "transcription",
    "feedback": "Great accuracy!"
  }'
```

## Data Retention

### Database Storage

- **Performance Metrics**: 90 days
- **Accuracy Metrics**: 180 days
- **User Satisfaction**: 1 year
- **Usage Analytics**: 2 years
- **System Health**: 30 days

### Time-Series Data

- **Prometheus**: 200 hours (configurable)
- **InfluxDB**: 1 year (if enabled)

## Troubleshooting

### Common Issues

1. **High Memory Usage in Prometheus**
   ```bash
   # Reduce retention time
   --storage.tsdb.retention.time=100h
   ```

2. **Missing Metrics**
   ```bash
   # Check if application is sending metrics
   curl http://localhost:3000/api/monitoring/metrics
   ```

3. **Grafana Dashboard Not Loading**
   ```bash
   # Verify Prometheus connection
   docker logs ai-interview-grafana
   ```

### Performance Optimization

1. **Database Indexes**: Ensure proper indexing on timestamp columns
2. **Metric Aggregation**: Use appropriate time windows for queries
3. **Data Cleanup**: Implement automated cleanup for old metrics

## Security Considerations

1. **Authentication**: Secure Grafana with proper authentication
2. **Network Security**: Use internal networks for monitoring traffic
3. **Data Privacy**: Ensure no PII in metrics
4. **Access Control**: Limit access to monitoring endpoints

## Development

### Adding New Metrics

1. Define the metric interface
2. Add database model (if needed)
3. Implement collection in service
4. Add API endpoint
5. Create Grafana visualization
6. Set up alerts (if needed)

### Testing

```bash
# Run monitoring tests
npm test -- --testPathPattern=monitoring

# Test specific service
npm test -- monitoring.service.spec.ts
```

## Production Deployment

### Environment Variables

```bash
# Monitoring configuration
MONITORING_ENABLED=true
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
ALERT_WEBHOOK_URL=http://your-app:3000/api/monitoring/alerts/webhook

# Database retention
METRICS_RETENTION_DAYS=90
ANALYTICS_RETENTION_DAYS=730
```

### Scaling Considerations

1. **Database Partitioning**: Partition metrics tables by date
2. **Metric Sampling**: Sample high-frequency metrics
3. **Horizontal Scaling**: Use multiple Prometheus instances
4. **Load Balancing**: Distribute monitoring load

## Support

For issues or questions about the monitoring system:

1. Check the logs: `docker logs ai-interview-prometheus`
2. Verify configuration: Review `prometheus.yml` and `alertmanager.yml`
3. Test connectivity: Ensure all services can communicate
4. Review metrics: Check if data is being collected properly