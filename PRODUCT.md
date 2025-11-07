# VeggieScore / MunchMatcher

## Product Summary

VeggieScore / MunchMatcher is an intelligent restaurant discovery platform that helps users find restaurants based on dietary preferences and food cravings. The platform automatically discovers restaurants via Google Places API, crawls their websites for menu data, processes menus through self-hosted OCR workers, and computes a VeggieScore along with craving match scores.

## Core Features

### 🔍 Smart Discovery
- **On-demand restaurant discovery** via Google Places API
- **Intelligent menu crawling** from restaurant websites (HTML, PDFs, images)
- **Linked data extraction** (JSON-LD, Microdata, RDFa, OpenGraph)
- **Self-hosted OCR processing** using open-source stack for menu image analysis

### 📊 Scoring & Matching
- **VeggieScore** - Quantitative score for plant-based options
- **MunchMatcher** - Craving-based matching using embeddings and semantic search
- **Dietary filtering** - Support for vegetarian, vegan, gluten-free, and custom preferences

### 🎮 Gamification & Social
- **Discovery rewards** - Earn points for discovering places, uploading menus, and reviewing
- **Quest system** - Daily/weekly challenges and achievements
- **Badges & levels** - Progression system with Bronze/Silver/Gold/Platinum tiers
- **Leaderboards** - Global, city, and friends rankings
- **Streaks & boosters** - Consecutive day rewards and multipliers
- **Social feed** - Shareable achievements and discoveries

### 🛡️ Admin & Moderation
- **Secure admin area** with SSO, MFA, and RBAC
- **Manual menu editing** with override and approval workflows
- **Reprocessing pipeline** - Force re-crawl and re-OCR
- **Audit trail** - Immutable logs for compliance
- **User management** - Ban, limitations, rewards ledger
- **Restaurant claim/opt-out** - Legal compliance workflow

## Technology Stack

### Frontend
- **Next.js** - SSR/SSG/ISR for SEO-optimized public website
- **Expo** - Cross-platform mobile app (iOS/Android)
- **Protected admin routes** - Secure moderation interface

### Backend (Supabase)
- **PostgreSQL** with pgvector for embeddings
- **Supabase Storage** for menus, images, artifacts
- **Supabase Auth** for user authentication
- **Edge Functions** (Deno) for discovery, awards, admin APIs

### Self-Hosted Processing Layer
- **Crawler service** (Node/Python) - Web scraping, linked data extraction
- **OCR workers** - Image preprocessing, layout detection, text extraction
  - OpenCV for preprocessing
  - LayoutParser/Donut for layout detection
  - PaddleOCR/Tesseract/Calamari for OCR
  - Post-correction with spell-check and dictionaries
- **Parser & Labeler** - Menu structure parsing, AI classification, embeddings
- **Job Queue** - Redis (RQ/BullMQ) or Supabase jobs table

### OCR Stack (Recommended)
- **Preprocessing**: OpenCV (deskew, denoise, upscaling)
- **Layout Detection**: LayoutParser or YOLO-style models
- **OCR Engine**: PaddleOCR (multilingual, high accuracy)
- **Postprocessing**: Price extraction, currency normalization, fuzzy ingredient matching
- **Section Detection**: AI-powered menu section classification

## Key Differentiators

1. **Self-hosted OCR** - Full control over menu processing, no third-party OCR costs
2. **Comprehensive crawling** - Respects robots.txt while maximizing menu data collection
3. **Gamification-first** - Engaging user experience with rewards for contributions
4. **Provenance tracking** - Full audit trail from crawl to processed menu
5. **Restaurant-friendly** - Claim and opt-out workflows for legal compliance
6. **Embeddings-powered matching** - Semantic search for nuanced craving matches

## User Journey

1. **Search** - User searches for restaurants in an area by VeggieScore or cravings
2. **Discover** - System finds new places via Google Places and initiates crawl
3. **Process** - Workers crawl website, OCR menus, parse items, compute scores
4. **Match** - User sees results ranked by VeggieScore or craving similarity
5. **Contribute** - User uploads menu photos, writes reviews, earns points
6. **Compete** - Track progress on leaderboards, complete quests, unlock badges
7. **Share** - Post achievements to social feed, invite friends

## Security & Governance

- **Service keys** secured in Edge Functions and worker environments only
- **Row-level security (RLS)** policies on all database tables
- **Admin SSO + MFA** - Multi-factor authentication required
- **Robots.txt compliance** - Respect site terms and crawler politeness
- **Audit logging** - All admin actions tracked immutably
- **User privacy** - GDPR-compliant data handling

## Business Model Options

- **Freemium** - Basic features free, premium for advanced filters/features
- **Restaurant partnerships** - Paid placement or featured listings
- **API licensing** - VeggieScore API for third-party apps
- **Data insights** - Anonymized dietary trend reports for restaurants

## Success Metrics

- **Discovery rate** - % of searched areas with full coverage
- **OCR accuracy** - Successfully parsed menu items
- **User engagement** - Daily active users, quest completion rates
- **Content quality** - User-submitted menus, verified reviews
- **Match satisfaction** - User ratings of craving matches
