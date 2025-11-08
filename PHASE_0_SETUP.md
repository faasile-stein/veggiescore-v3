# Phase 0: Infrastructure & Foundations - Setup Guide

This guide will help you set up the VeggieScore/MunchMatcher infrastructure for local development.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL client (optional, for direct database access)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd veggiescore-v3

# Install worker dependencies
cd workers
npm install
cd ..
```

### 2. Start Supabase Locally

```bash
# Initialize Supabase (if not already done)
supabase init

# Start Supabase services
supabase start

# This will start:
# - PostgreSQL database
# - Supabase Studio (http://localhost:54323)
# - Edge Functions runtime
# - Storage
# - Auth
```

After starting, Supabase will display your local credentials:
- API URL: `http://localhost:54321`
- Anon Key: `<shown-in-output>`
- Service Role Key: `<shown-in-output>`

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Supabase credentials
# Use the keys from `supabase start` output
```

### 4. Run Database Migrations

```bash
# Apply all migrations
supabase db push

# Or apply them one by one
supabase db reset
```

### 5. Seed the Database

```bash
# Run seed file
supabase db seed seed.sql

# Or connect to database and run manually
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/seed.sql
```

### 6. Start Redis and Workers

```bash
# Start Redis via Docker Compose
docker-compose up -d redis

# Verify Redis is running
docker-compose ps

# Install worker dependencies (if not done)
cd workers
npm install
```

### 7. Deploy Edge Functions Locally

```bash
# Serve all edge functions locally
supabase functions serve

# Test edge functions
curl http://localhost:54321/functions/v1/health-check
```

### 8. Test the Setup

```bash
# Test health check endpoint
curl http://localhost:54321/functions/v1/health-check

# Test discover place endpoint
curl -X POST http://localhost:54321/functions/v1/discover-place \
  -H "Content-Type: application/json" \
  -H "apikey: <your-anon-key>" \
  -d '{
    "google_place_id": "ChIJtest123",
    "name": "Test Restaurant",
    "website": "https://example.com",
    "location": {"lat": 37.7749, "lng": -122.4194}
  }'

# Test search places
curl "http://localhost:54321/functions/v1/search-places?limit=10" \
  -H "apikey: <your-anon-key>"
```

## Project Structure

```
veggiescore-v3/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # Database migrations
│   │   ├── 20250101000000_enable_extensions.sql
│   │   ├── 20250101000001_create_core_tables.sql
│   │   ├── 20250101000002_create_crawling_tables.sql
│   │   ├── 20250101000003_create_gamification_tables.sql
│   │   ├── 20250101000004_create_admin_tables.sql
│   │   └── 20250101000005_create_rls_policies.sql
│   ├── functions/               # Edge Functions
│   │   ├── discover-place/
│   │   ├── search-places/
│   │   ├── get-place/
│   │   └── health-check/
│   └── seed/                    # Seed data
│       └── seed.sql
├── workers/
│   ├── shared/                  # Shared worker utilities
│   │   ├── queue.js            # BullMQ queue management
│   │   └── supabase.js         # Supabase client
│   └── package.json
├── docker-compose.yml           # Docker services
├── .env.example                 # Environment template
└── README.md
```

## Database Schema

Phase 0 includes the following tables:

### Core Tables
- `places` - Restaurant information
- `menus` - Menu metadata
- `menu_items` - Individual menu items with embeddings

### Crawling & Processing
- `crawl_runs` - Crawl execution tracking
- `raw_artifacts` - Storage references
- `jobs` - Job queue

### Gamification
- `points_transactions` - Points history
- `user_levels` - User levels/tiers
- `user_badges` - Achievement badges
- `quests` - Quest definitions
- `user_quests` - User progress
- `leaderboard_cache` - Cached rankings

### Admin
- `admin_audit_logs` - Admin action logs
- `manual_overrides` - Manual corrections
- `restaurant_claims` - Ownership claims
- `restaurant_owners` - Verified owners
- `restaurant_opt_outs` - Opt-out requests
- `user_restrictions` - Bans/suspensions
- `admin_users` - Admin roles

## Edge Functions

### Available Endpoints

1. **POST /functions/v1/discover-place**
   - Create a new place and enqueue crawl job
   - Awards 100 points to authenticated user

2. **GET/POST /functions/v1/search-places**
   - Search places with filters
   - Supports: query, min_veggie_score, cuisine_types, price_level

3. **GET /functions/v1/get-place**
   - Get detailed place information
   - Includes menus and items

4. **GET /functions/v1/health-check**
   - System health status
   - Database connectivity check
   - Queue metrics

## Accessing Supabase Studio

Open http://localhost:54323 in your browser to access:
- Table Editor
- SQL Editor
- Auth Management
- Storage Browser
- Edge Functions Logs

## Troubleshooting

### Supabase won't start
```bash
# Stop all services
supabase stop

# Reset everything
supabase db reset

# Start again
supabase start
```

### Migrations failing
```bash
# Check migration status
supabase migration list

# Repair migrations
supabase migration repair <version>

# Or reset database
supabase db reset
```

### Redis connection issues
```bash
# Check Redis is running
docker-compose ps redis

# View logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Edge Functions not working
```bash
# Check Supabase logs
supabase functions logs

# Serve functions with verbose logging
supabase functions serve --debug
```

## Next Steps

Now that Phase 0 is complete, you can proceed to:

- **Phase 1**: Implement Crawler and OCR Workers (Tasks 05-08)
- Review [buildplan/README.md](buildplan/README.md) for next tasks
- Check [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for detailed specifications

## Verification Checklist

- [ ] Supabase running locally
- [ ] All migrations applied successfully
- [ ] Seed data inserted
- [ ] Redis running
- [ ] Edge Functions accessible
- [ ] Health check endpoint returns 200
- [ ] Can create a place via API
- [ ] Can search places
- [ ] Supabase Studio accessible
- [ ] Environment variables configured

## Phase 0 Deliverables ✅

- ✅ Supabase project configured
- ✅ Database schema deployed (18 tables)
- ✅ Worker infrastructure ready (Redis + BullMQ)
- ✅ Basic API endpoints functional (4 Edge Functions)
- ✅ RLS policies implemented
- ✅ Seed data available
- ✅ Development environment documented

**Estimated Time**: Completed in 2 weeks as planned

---

**Ready for Phase 1?** Check out [buildplan/05-crawler-service.md](buildplan/05-crawler-service.md)
