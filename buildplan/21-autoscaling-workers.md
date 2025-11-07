# Task 21: Autoscaling Workers

## Phase
Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

## Objective
Deploy autoscaling infrastructure for worker processes to handle variable load efficiently.

## Description
Implement Kubernetes Horizontal Pod Autoscaler (HPA) for worker deployments to automatically scale based on CPU/memory usage and queue depth, ensuring efficient resource utilization.

## Worker Types to Scale
1. **Crawler Workers** - Scale based on crawl queue depth
2. **OCR Workers** - Scale based on OCR queue depth and CPU
3. **Parser Workers** - Scale based on parse queue depth
4. **Labeler Workers** - Scale based on label queue depth

## Tasks
1. Create Kubernetes deployment manifests
2. Configure HPA for each worker type
3. Set up resource requests and limits
4. Implement queue depth metrics
5. Configure scaling policies
6. Set up pod disruption budgets
7. Test scaling behavior
8. Optimize scaling thresholds
9. Set up autoscaling alerts
10. Document scaling configuration
11. Monitor costs

## Implementation Details

### Kubernetes HPA Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ocr-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ocr-worker
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: External
    external:
      metric:
        name: redis_queue_length
        selector:
          matchLabels:
            queue: ocr
      target:
        type: AverageValue
        averageValue: "50"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### Worker Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocr-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ocr-worker
  template:
    metadata:
      labels:
        app: ocr-worker
    spec:
      containers:
      - name: worker
        image: veggiescore/ocr-worker:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

## Scaling Policies

### OCR Workers
- Min: 3 replicas
- Max: 20 replicas
- Scale up: Queue depth > 50 per worker
- Scale down: Queue depth < 10 per worker

### Crawler Workers
- Min: 2 replicas
- Max: 10 replicas
- Scale up: Queue depth > 20 per worker
- Scale down: Queue depth < 5 per worker

### Parser Workers
- Min: 2 replicas
- Max: 15 replicas
- Scale up: Queue depth > 30 per worker
- Scale down: Queue depth < 10 per worker

## Success Criteria
- [ ] Kubernetes cluster configured
- [ ] All deployments created
- [ ] HPA configured for all worker types
- [ ] Resource limits set appropriately
- [ ] Queue depth metrics exposed
- [ ] Scaling policies working
- [ ] Pod disruption budgets set
- [ ] Scaling tested under load
- [ ] Thresholds optimized
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Cost monitoring in place

## Dependencies
- Task 03: Worker Infrastructure
- Task 05-06: Worker implementations

## Estimated Time
5-6 days

## Notes
- Start conservative with scaling
- Monitor costs closely
- Use spot instances where possible
- Consider regional deployment
- Plan for worker version updates
- Test failure scenarios
