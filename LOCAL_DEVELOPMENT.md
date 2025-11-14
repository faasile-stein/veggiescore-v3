# VeggieScore Local Development Guide

Complete guide for running VeggieScore locally using Docker for development and testing.

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker** (version 20.10+)
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Verify: `docker --version`

- **Docker Compose** (version 2.0+)
  - Usually included with Docker Desktop
  - Verify: `docker-compose --version`

- **Supabase CLI** (for local database and services)
  - Install: `npm install -g supabase` or `brew install supabase/tap/supabase` (macOS)
  - Verify: `supabase --version`
  - [Supabase CLI Docs](https://supabase.com/docs/guides/cli)

- **Git** (for cloning the repository)
  - Verify: `git --version`

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free
- **CPU**: 4 cores recommended

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/veggiescore-v3.git
cd veggiescore-v3
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```env
# Supabase - Auto-configured by Supabase CLI when using local development
# After running ./start-local.sh start, Supabase credentials will be displayed
# Default local values:
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<shown-after-supabase-start>
SUPABASE_SERVICE_KEY=<shown-after-supabase-start>

# Redis
REDIS_HOST=redis
REDIS_PORT=8379

# OpenAI (for AI classification and embeddings)
OPENAI_API_KEY=your-openai-api-key

# Optional: Sentry for error tracking
SENTRY_DSN=your-sentry-dsn
```

**Note:** When using Supabase local (`supabase start`), the startup script will automatically display the Supabase URL, anon key, and service role key. You can also view them anytime with `supabase status`.

### 3. Start All Services

**Using the startup script (Recommended):**

```bash
./start-local.sh start
```

**Or manually:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

### 4. Verify Services

The startup script will automatically check service health. You can also manually verify:

```bash
# Check all services are running
docker-compose -f docker-compose.yml -f docker-compose.local.yml ps

# Check Supabase status
supabase status

# Check Redis
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec redis redis-cli ping

# Check PostgreSQL (via Supabase)
psql -h localhost -p 54322 -U postgres -c "SELECT version();"
```

## Service URLs

Once all services are running:

| Service | URL | Purpose |
|---------|-----|---------|
| Supabase Studio | `http://localhost:54323` | Database UI & Management |
| Supabase API | `http://localhost:54321` | REST & GraphQL API |
| PostgreSQL | `localhost:54322` | Direct Database Access |
| Redis | `localhost:8379` | Cache & Queue |
| Admin Dashboard | `http://localhost:8000` | Admin UI |

## Using the Startup Script

The `start-local.sh` script provides an easy way to manage all services:

### Interactive Menu

```bash
./start-local.sh
# or
./start-local.sh menu
```

This opens an interactive menu with options:
1. Start all services
2. Stop all services
3. Restart all services
4. View logs
5. View status
6. Health check
7. Rebuild images
8. Run database migrations
9. Reset database
10. Open Supabase Studio
11. Clean up everything
12. Exit

### Command Line Usage

```bash
# Start all services
./start-local.sh start

# Stop all services
./start-local.sh stop

# Restart all services
./start-local.sh restart

# View logs (follow mode)
./start-local.sh logs

# Check service status
./start-local.sh status

# Run health check
./start-local.sh health

# Rebuild all images
./start-local.sh rebuild

# Run database migrations
./start-local.sh migrate

# Reset database (WARNING: deletes all data)
./start-local.sh reset

# Clean up everything (containers, volumes, images)
./start-local.sh clean
```

## Docker Compose Commands

### Starting Services

```bash
# Start all services in background
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d

# Start specific service
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d redis

# Start with build
docker-compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs

# Follow logs
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f crawler-worker

# Last 100 lines
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs --tail=100
```

### Managing Services

```bash
# Stop all services
docker-compose -f docker-compose.yml -f docker-compose.local.yml down

# Stop and remove volumes
docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v

# Restart a service
docker-compose -f docker-compose.yml -f docker-compose.local.yml restart ocr-worker

# Rebuild a service
docker-compose -f docker-compose.yml -f docker-compose.local.yml build --no-cache ocr-worker
```

### Executing Commands in Containers

```bash
# Access Redis CLI
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec redis redis-cli

# Access PostgreSQL
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec postgres psql -U postgres

# Access worker shell
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec crawler-worker sh

# Run a one-off command
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec parser-worker npm test
```

## Service Architecture

### Infrastructure Services

**Redis** (`redis:7-alpine`)
- Port: 8379
- Purpose: Job queue (BullMQ) and caching
- Data: Persistent volume `redis-local-data`

**PostgreSQL** (Managed by Supabase CLI)
- Port: 54322 (localhost)
- Purpose: Main database with pgvector and PostGIS extensions
- Management: Via Supabase Studio at http://localhost:54323
- Data: Managed by Supabase in Docker volumes
- Credentials: postgres/postgres (default local credentials)
- Note: Supabase also provides Auth, Storage, and Edge Functions locally

### Worker Services

**Crawler Worker** (Node.js)
- Purpose: Fetch restaurant websites and extract menu data
- Dependencies: Redis, Supabase
- Concurrency: 3 workers
- Hot reload: Enabled with volume mounts

**OCR Worker** (Python + PaddleOCR)
- Purpose: Extract text from menu images/PDFs
- Dependencies: Supabase
- Replicas: 1 (local), 3 (production)
- GPU: Optional (not enabled by default)

**Parser Worker** (Node.js)
- Purpose: Parse OCR text into structured menu items
- Dependencies: Redis, Supabase
- Concurrency: 2 workers

**Labeler Worker** (Node.js + OpenAI)
- Purpose: Classify menu items with dietary labels
- Dependencies: Redis, Supabase, OpenAI API
- Replicas: 1 (local), 2 (production)

**Embeddings Worker** (Python + OpenAI)
- Purpose: Generate vector embeddings for semantic search
- Dependencies: Supabase, OpenAI API
- Backfill: Disabled by default

### Application Services

**Admin Dashboard** (Next.js 14)
- Port: 8000
- Purpose: Admin panel for managing places and menus
- Hot reload: Enabled
- Auth: Supabase Auth

## Development Workflow

### Making Code Changes

All services are configured with volume mounts for hot reloading:

```bash
# Edit worker code
vim workers/crawler/index.js

# Changes are automatically detected and reloaded
# Check logs to verify:
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f crawler-worker
```

### Running Database Migrations

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or via the startup script
./start-local.sh migrate

# Or manually via PostgreSQL
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/your_migration.sql
```

### Testing Workers

```bash
# Test crawler worker
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec crawler-worker npm test

# Test with specific input
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec crawler-worker \
  node -e "require('./index.js').testCrawl('https://example.com')"
```

### Debugging

**View Real-time Logs:**
```bash
# All services
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f ocr-worker
```

**Attach to Running Container:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec crawler-worker sh
```

**Inspect Container:**
```bash
docker inspect veggiescore-crawler
```

## Common Tasks

### Seed Test Data

```bash
# Via Supabase Studio SQL Editor (recommended)
# 1. Open http://localhost:54323
# 2. Navigate to SQL Editor
# 3. Run your seed scripts

# Or via command line
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/seed.sql

# Or use Supabase db seed (if configured in config.toml)
supabase db seed
```

### Clear Redis Queue

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec redis redis-cli FLUSHALL
```

### Reset Database

```bash
# Using Supabase CLI (recommended)
supabase db reset

# Or via the startup script
./start-local.sh reset

# Or manually stop everything and restart
./start-local.sh stop
./start-local.sh start
```

### Monitor Resource Usage

```bash
# View resource usage
docker stats

# View specific service
docker stats veggiescore-ocr
```

## Troubleshooting

### Services Won't Start

**Issue:** Port already in use

```bash
# Find process using port 8432
lsof -i :8432  # macOS/Linux
netstat -ano | findstr :8432  # Windows

# Kill the process or change the port in docker-compose.local.yml
```

**Issue:** Out of disk space

```bash
# Clean up Docker
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Workers Not Processing Jobs

**Check Redis connection:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec redis redis-cli ping
```

**Check queue depth:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml exec redis redis-cli LLEN bull:ocr:wait
```

**Restart workers:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml restart crawler-worker ocr-worker parser-worker
```

### OCR Worker Memory Issues

OCR workers can use significant memory. If experiencing OOM errors:

```bash
# Increase Docker memory limit (Docker Desktop Settings)
# Or reduce replicas in docker-compose.local.yml

# Check memory usage
docker stats veggiescore-ocr
```

### Database Connection Issues

```bash
# Check if Supabase is running
supabase status

# Check PostgreSQL connection
psql -h localhost -p 54322 -U postgres -c "SELECT version();"

# Restart Supabase if needed
supabase stop
supabase start
```

## Performance Tuning

### Adjust Worker Concurrency

Edit `.env`:
```env
WORKER_CONCURRENCY=5  # Increase for more throughput
```

### Limit Docker Resources

Edit `docker-compose.local.yml`:
```yaml
services:
  ocr-worker:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

### Enable GPU for OCR (if available)

Edit `docker-compose.local.yml`:
```yaml
services:
  ocr-worker:
    runtime: nvidia
    environment:
      - CUDA_VISIBLE_DEVICES=0
```

## Mobile App Development

The mobile app (Expo) runs separately:

```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npm start

# Or run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## Production vs Development

### Development (docker-compose.local.yml)

- Hot reload enabled
- Debug logging
- Exposed ports for direct access
- Reduced replicas
- Source code mounted as volumes
- Development dependencies included

### Production (docker-compose.yml + Kubernetes)

- Optimized builds
- Production logging
- Internal networking
- Full scaling with HPA
- Immutable containers
- Production dependencies only

## Cleanup

### Stop and Remove Everything

```bash
./start-local.sh clean
```

Or manually:

```bash
# Stop and remove containers and volumes
docker-compose -f docker-compose.yml -f docker-compose.local.yml down -v

# Remove images
docker-compose -f docker-compose.yml -f docker-compose.local.yml down --rmi local

# Complete cleanup
docker system prune -a --volumes
```

## Getting Help

- **GitHub Issues**: [https://github.com/yourusername/veggiescore-v3/issues](https://github.com/yourusername/veggiescore-v3/issues)
- **Documentation**: See [README.md](README.md) for project overview
- **Phase Docs**: See `PHASE_*_COMPLETE.md` for detailed implementation docs

## Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)

## Next Steps

Once local development is running:

1. **Run database migrations**: `./start-local.sh migrate` or `supabase db push`
2. **Open Supabase Studio**: `http://localhost:54323` (or `./start-local.sh` menu option 10)
3. **Seed test data**: Via Supabase Studio SQL editor or `supabase/seed/` scripts
4. **Access admin dashboard**: `http://localhost:3000`
5. **Test workers**: Submit test jobs via admin or API
6. **Monitor logs**: `./start-local.sh logs`

**Useful Supabase Commands:**
- `supabase status` - View all service URLs and keys
- `supabase db reset` - Reset database to clean state
- `supabase db push` - Apply migrations
- `supabase functions serve` - Run Edge Functions locally
- `supabase stop` - Stop all Supabase services

Happy coding! 🚀🌱
