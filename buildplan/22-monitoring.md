# Task 22: Monitoring & Alerting

## Phase
Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

## Objective
Set up comprehensive monitoring, logging, and alerting for system health and business metrics.

## Description
Implement full observability stack with Prometheus metrics, Sentry error tracking, log aggregation, and alerting for both technical and business metrics.

## Monitoring Stack

### 1. Metrics (Prometheus + Grafana)
- System metrics (CPU, memory, disk)
- Application metrics (request rate, latency)
- Worker metrics (queue depth, processing time)
- Business metrics (users, searches, uploads)

### 2. Error Tracking (Sentry)
- Exception tracking
- Error grouping
- Release tracking
- User feedback

### 3. Logging (Loki or CloudWatch)
- Centralized log aggregation
- Structured logging
- Log search and analysis

### 4. Alerting (Alertmanager)
- Critical error alerts
- Performance degradation alerts
- Business metric alerts
- On-call routing

### 5. Uptime Monitoring
- Endpoint health checks
- API availability
- Worker health

## Tasks
1. Set up Prometheus server
2. Configure Grafana dashboards
3. Instrument code with metrics
4. Set up Sentry error tracking
5. Configure log aggregation
6. Create alerting rules
7. Set up AlertManager
8. Configure on-call rotation
9. Create runbooks for alerts
10. Set up uptime monitoring
11. Create business dashboards
12. Test alerting flows

## Key Metrics

### System Health
- **API Latency**: p50, p95, p99 response times
- **Error Rate**: % of requests failing
- **Worker Queue Depth**: Pending jobs count
- **OCR Success Rate**: % of successful OCR jobs
- **Parser Accuracy**: % of correctly parsed items
- **Database Performance**: Query latency, connections

### Business Metrics
- **DAU/MAU**: Daily/monthly active users
- **Discovery Rate**: New restaurants per day
- **Upload Rate**: Menu uploads per day
- **Search Volume**: Searches per day
- **Conversion Rate**: Searches → discoveries
- **Retention**: Day 1, 7, 30 retention

## Implementation Details

### Prometheus Metrics
```javascript
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const ocrJobsProcessed = new prometheus.Counter({
  name: 'ocr_jobs_processed_total',
  help: 'Total number of OCR jobs processed',
  labelNames: ['status']
});
```

### Sentry Setup
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    return event;
  }
});
```

### Alert Rules
```yaml
groups:
- name: veggiescore
  rules:
  - alert: HighOCRFailureRate
    expr: rate(ocr_failures_total[5m]) > 0.2
    for: 5m
    annotations:
      summary: "OCR failure rate above 20%"
      description: "OCR workers failing at {{ $value }}%"

  - alert: WorkerQueueBacklog
    expr: redis_queue_length > 1000
    for: 10m
    annotations:
      summary: "Worker queue has >1000 pending jobs"

  - alert: HighAPILatency
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
    for: 5m
    annotations:
      summary: "P95 API latency above 1s"

  - alert: LowDailyActiveUsers
    expr: daily_active_users < 10
    for: 1h
    annotations:
      summary: "DAU dropped below 10"
```

## Dashboards to Create
1. **System Overview** - Overall health
2. **API Performance** - Request rates, latency
3. **Worker Health** - Queue depth, processing times
4. **Business Metrics** - Users, engagement
5. **Cost Tracking** - Infrastructure costs
6. **User Funnel** - Activation, retention

## Success Criteria
- [ ] Prometheus deployed and scraping
- [ ] Grafana dashboards created
- [ ] Code instrumented with metrics
- [ ] Sentry integrated
- [ ] Logs aggregated
- [ ] Alert rules configured
- [ ] AlertManager routing working
- [ ] On-call rotation set up
- [ ] Runbooks created
- [ ] Uptime monitoring active
- [ ] All dashboards functional
- [ ] Alerts tested

## Dependencies
- Task 21: Autoscaling Workers
- All previous tasks (need metrics)

## Estimated Time
5-6 days

## Notes
- Start with critical alerts only
- Avoid alert fatigue
- Document expected baselines
- Review metrics weekly
- Adjust thresholds based on data
- Create public status page
