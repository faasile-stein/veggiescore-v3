# VeggieScore / MunchMatcher 🌱

> Discover vegan and vegetarian restaurant options powered by AI, gamification, and semantic search

VeggieScore is a platform that helps people discover plant-based dining options by automatically crawling restaurant menus, analyzing them with AI, and scoring restaurants based on their vegan/vegetarian friendliness. MunchMatcher enables users to search by describing what they're craving (e.g., "creamy pasta comfort food") using semantic search.

## Features

### Core Features
- 🤖 **Automated Menu Crawling** - Discovers and extracts menus from restaurant websites
- 🔍 **OCR Processing** - Extracts text from menu images and PDFs using PaddleOCR
- 🏷️ **AI Classification** - Identifies dietary labels (vegan, vegetarian, gluten-free, etc.)
- 📊 **VeggieScore** - 0-100 score indicating vegan/vegetarian-friendliness
- 🔎 **Semantic Search** - Find restaurants by describing your craving
- 📍 **Location-Based** - Search nearby restaurants with filtering

### Gamification
- ✨ **Points & Levels** - Earn points for contributions (Bronze → Silver → Gold → Platinum)
- 🏆 **Badges** - Unlock achievements for various accomplishments
- 🎯 **Quests** - Daily, weekly, and special challenges
- 📈 **Leaderboards** - Global, city-based, and friend rankings
- 📸 **User Contributions** - Upload menu photos and earn points

### Platform
- 🌐 **Web App** - Next.js with SSR/SSG for SEO
- 📱 **Mobile App** - iOS and Android via Expo/React Native
- 👨‍💼 **Admin Dashboard** - Management tools with RBAC
- 🏢 **Restaurant Claims** - Verified ownership with opt-out option

## Tech Stack

### Frontend
- **Web**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Mobile**: Expo (React Native), TypeScript
- **UI**: Shadcn/ui, Radix UI

### Backend
- **Database**: Supabase (PostgreSQL + pgvector + PostGIS)
- **API**: Supabase Edge Functions (Deno)
- **Auth**: Supabase Auth (Email, OAuth, MFA)
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

### Workers & Processing
- **Crawler**: Node.js with Cheerio/Puppeteer
- **OCR**: Python with PaddleOCR, OpenCV
- **Parser**: Node.js
- **AI**: OpenAI API (embeddings, classification)
- **Queue**: Redis with BullMQ
- **Orchestration**: Kubernetes

### Infrastructure
- **Containerization**: Docker
- **Monitoring**: Prometheus, Grafana, Sentry
- **CDN**: Cloudflare/Vercel Edge
- **Hosting**: Vercel (web), Supabase (backend), Kubernetes (workers)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Supabase CLI: `npm install -g supabase`
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/veggiescore-v3.git
cd veggiescore-v3

# Install dependencies
cd workers && npm install && cd ..

# Start Supabase
supabase start

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations
supabase db push

# Seed database
supabase db seed seed.sql

# Start Redis
docker-compose up -d redis

# Start Edge Functions
supabase functions serve
```

For detailed setup instructions, see [PHASE_0_SETUP.md](PHASE_0_SETUP.md).

### Test the Setup

```bash
# Health check
curl http://localhost:54321/functions/v1/health-check

# Create a test place
curl -X POST http://localhost:54321/functions/v1/discover-place \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "google_place_id": "ChIJtest",
    "name": "Green Cafe",
    "website": "https://example.com"
  }'
```

## Project Structure

```
veggiescore-v3/
├── buildplan/              # 24 detailed task files (5 phases)
├── supabase/
│   ├── migrations/        # Database schema migrations
│   ├── functions/         # Edge Functions (API)
│   ├── seed/             # Development seed data
│   └── config.toml       # Supabase configuration
├── workers/
│   ├── shared/           # Shared utilities (queue, supabase)
│   ├── crawler/          # [Phase 1] Web crawler
│   ├── ocr/              # [Phase 1] OCR processing
│   ├── parser/           # [Phase 2] Menu parser
│   └── labeler/          # [Phase 2] AI classifier
├── web/                   # [Phase 3] Next.js web app
├── mobile/                # [Phase 3] Expo mobile app
├── admin/                 # [Phase 2] Admin dashboard
├── docker-compose.yml     # Local development services
├── DEVELOPMENT_PLAN.md    # Detailed technical plan
├── PRODUCT.md            # Product documentation
└── README.md             # This file
```

## Development Phases

The project is organized into 5 phases over 16 weeks:

### ✅ Phase 0: Infrastructure & Foundations (Weeks 1-2) - COMPLETED
- Supabase setup with pgvector and PostGIS
- Database schema (18 tables)
- Worker infrastructure (Redis, BullMQ)
- Basic Edge Functions (4 endpoints)

### 🚧 Phase 1: Crawler + OCR Workers (Weeks 3-5) - IN PROGRESS
- Web crawler with robots.txt compliance
- OCR pipeline with PaddleOCR
- Storage integration
- Testing with 10+ restaurants

### 📋 Phase 2: Parsing, Labeling & Admin (Weeks 6-8)
- Menu parser service
- AI dietary label classifier
- Admin dashboard with RBAC
- Manual override system

### 📋 Phase 3: Gamification + UX (Weeks 9-11)
- Points, badges, and quests
- Mobile app (iOS + Android)
- Leaderboards
- Beta launch (50 users)

### 📋 Phase 4: Embeddings & MunchMatcher (Weeks 12-14)
- Embeddings pipeline
- Semantic craving search
- VeggieScore v2 algorithm
- SEO optimization

### 📋 Phase 5: Hardening, Scaling & Polish (Weeks 15-16)
- Autoscaling workers (Kubernetes HPA)
- Monitoring & alerting (Prometheus, Grafana)
- A/B testing framework
- Performance optimization

See [buildplan/README.md](buildplan/README.md) for detailed task breakdown.

## Documentation

- **[PRODUCT.md](PRODUCT.md)** - Product overview and features
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - Comprehensive technical plan
- **[PHASE_0_SETUP.md](PHASE_0_SETUP.md)** - Setup guide for local development
- **[buildplan/](buildplan/)** - 24 detailed task files with implementation guides

## API Documentation

### Edge Functions

All endpoints are prefixed with `/functions/v1/`

#### `POST /discover-place`
Create a new place and enqueue crawl job.

```json
{
  "google_place_id": "ChIJ...",
  "name": "Restaurant Name",
  "website": "https://example.com",
  "location": {"lat": 37.7749, "lng": -122.4194}
}
```

#### `GET /search-places`
Search for places with filters.

```
?query=vegan&min_veggie_score=80&limit=20
```

#### `GET /get-place`
Get detailed place information.

```
?id=uuid
```

#### `GET /health-check`
System health status.

## Database Schema

- **Core**: `places`, `menus`, `menu_items`
- **Processing**: `crawl_runs`, `raw_artifacts`, `jobs`
- **Gamification**: `points_transactions`, `user_levels`, `user_badges`, `quests`, `user_quests`, `leaderboard_cache`
- **Admin**: `admin_audit_logs`, `manual_overrides`, `restaurant_claims`, `restaurant_owners`, `admin_users`

## Contributing

We welcome contributions! Please see our contributing guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Environment Variables

Required environment variables (see `.env.example`):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=your-openai-key  # Phase 4
```

## Testing

```bash
# Run worker tests
cd workers
npm test

# Run web app tests
cd web
npm test

# Run mobile app tests
cd mobile
npm test
```

## Deployment

### Production Deployment

- **Web**: Deploy to Vercel
- **Backend**: Supabase Cloud
- **Workers**: Kubernetes cluster
- **Redis**: Redis Cloud or self-hosted

See deployment guides in `docs/` (coming soon).

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Supabase for the amazing backend platform
- PaddleOCR for OCR capabilities
- OpenAI for embeddings and classification
- The open-source community

## Contact

- Website: [veggiescore.com](https://veggiescore.com) (coming soon)
- Email: hello@veggiescore.com
- Twitter: [@veggiescore](https://twitter.com/veggiescore)

---

**Built with ❤️ for the plant-based community** 🌱
