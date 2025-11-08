# Task 03: Worker Infrastructure

## Phase
Phase 0: Infrastructure & Foundations (Weeks 1-2)

## Objective
Set up worker infrastructure including Redis queue and basic worker orchestration.

## Description
Configure the job queue system (Redis with BullMQ) and set up Docker Compose for local development. Prepare infrastructure for crawler, OCR, and parser workers.

## Tasks
1. Set up Redis for job queue
2. Configure BullMQ for job management
3. Create Docker Compose configuration for local development
4. Set up basic worker framework
5. Implement job queue monitoring
6. Configure environment variables for workers
7. Test job enqueueing and processing

## Implementation Details

### Docker Compose Setup
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Worker services to be added in later phases
```

### Job Queues to Create
- `crawl` - Website crawling jobs
- `ocr` - OCR processing jobs
- `parse` - Menu parsing jobs
- `label` - AI classification jobs

## Success Criteria
- [ ] Redis running locally via Docker Compose
- [ ] BullMQ configured and tested
- [ ] Job queues created
- [ ] Basic worker framework implemented
- [ ] Jobs can be enqueued and processed
- [ ] Worker health monitoring in place
- [ ] Documentation for running workers locally

## Dependencies
- Task 01: Supabase Setup
- Task 02: Database Schema

## Estimated Time
2-3 days

## Notes
- For production, consider Kubernetes deployment (k8s manifests)
- Alternative: Use Supabase jobs table instead of Redis
- Monitor Redis memory usage
- Consider queue prioritization
