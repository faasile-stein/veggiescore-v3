# VeggieScore / MunchMatcher - Development Plan

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Model](#data-model)
3. [Processing Pipeline](#processing-pipeline)
4. [Gamification System](#gamification-system)
5. [Admin & Security](#admin--security)
6. [Development Phases](#development-phases)
7. [Operational Guidelines](#operational-guidelines)

---

## Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────┐          ┌────────────────────────┐  │
│  │   Next.js Web    │          │    Expo Mobile App     │  │
│  │  (SSR/SSG/ISR)   │          │   (iOS + Android)      │  │
│  │  + Admin Area    │          │                        │  │
│  └──────────────────┘          └────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  PostgreSQL  │  │   Storage    │  │  Edge Functions  │ │
│  │  (pgvector)  │  │   (Menus)    │  │     (Deno)       │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Self-Hosted Processing Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Crawler    │  │ OCR Workers  │  │ Parser/Labeler   │ │
│  │   Service    │  │  (PaddleOCR) │  │  (AI Classify)   │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Job Queue (Redis/BullMQ)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

#### Next.js Website
- **Public pages** (SSG/ISR): Restaurant listings, place details, search results
- **Dynamic pages** (SSR): User profiles, personalized recommendations
- **Admin area** (Protected route): `/admin/*` with SSO + RBAC
- **SEO optimization**: Metadata, structured data, sitemaps
- **API routes**: Proxy to Supabase Edge Functions

#### Expo Mobile App
- **Search & discovery**: Location-based search, map view
- **Menu uploads**: Camera integration, photo gallery
- **Gamification**: Profile, leaderboards, quests, badges
- **Social feed**: Achievements, shares, friend activity
- **Offline support**: Cached data, sync on reconnect

### Backend Architecture

#### Supabase Core
- **PostgreSQL**:
  - pgvector extension for embeddings
  - Full-text search (tsvector)
  - PostGIS for geo queries
  - Row-level security (RLS) policies
- **Storage**:
  - Menu images (originals + processed)
  - PDF menus
  - Raw crawl artifacts (HTML, JSON)
  - User uploads
- **Auth**:
  - Email/password, OAuth (Google, Apple)
  - JWT tokens
  - MFA support
- **Edge Functions** (Deno):
  - `discover_place`: Create place + enqueue crawl
  - `search_places`: Vector similarity + filters
  - `award_points`: Gamification logic
  - `admin_*`: Protected admin APIs
  - `webhook_*`: External integrations

#### Self-Hosted Workers

##### Crawler Service (Node.js/Python)
```javascript
// Responsibilities:
// 1. Fetch restaurant website
// 2. Parse HTML for menu links
// 3. Extract JSON-LD/Microdata
// 4. Download PDFs/images
// 5. Store artifacts to Supabase Storage
// 6. Enqueue OCR jobs

const crawlerPipeline = {
  fetchHomepage: async (url) => {
    // Fetch with robots.txt compliance
    // Store raw HTML + headers
  },

  extractMenuLinks: (html) => {
    // Look for: /menu, /menu.pdf, sitemap.xml
    // Parse anchor text for menu indicators
  },

  extractStructuredData: (html) => {
    // JSON-LD: schema.org/Menu, MenuItem
    // Microdata, RDFa parsing
  },

  downloadAssets: async (urls) => {
    // Download PDFs/images
    // Store to Supabase Storage
    // Return artifact references
  },

  enqueueOCR: async (artifacts) => {
    // Push to Redis queue or Supabase jobs table
  }
};
```

##### OCR Workers (Python + OpenCV + PaddleOCR)
```python
# OCR Pipeline Stages

class OCRWorker:
    def preprocess(self, image):
        """
        - Deskew using cv2.warpAffine
        - Denoise with cv2.fastNlMeansDenoising
        - Upscale if resolution < 300 DPI
        - Adaptive thresholding
        """
        pass

    def layout_detection(self, image):
        """
        - LayoutParser or YOLO model
        - Detect: headers, columns, tables, menu sections
        - Return bounding boxes + types
        """
        pass

    def ocr_extract(self, image_regions):
        """
        - PaddleOCR for text extraction
        - Alternative: Tesseract, Calamari
        - Return text + confidence per region
        """
        pass

    def postprocess(self, ocr_results):
        """
        - Price extraction: regex for $X.XX, €X,XX
        - Currency normalization
        - Spell-check with custom dictionary
        - Fuzzy ingredient matching
        """
        pass

    def detect_sections(self, text_blocks):
        """
        - Classify: appetizers, mains, desserts, drinks
        - Use layout + keywords + ML model
        """
        pass
```

##### Parser & Labeler (Node.js + AI)
```javascript
// Responsibilities:
// 1. Parse OCR output into structured menu
// 2. Classify dietary labels (vegan, vegetarian, GF)
// 3. Generate embeddings
// 4. Compute VeggieScore

class MenuParser {
  parseItems(ocrText, sections) {
    // Extract: item name, price, description
    // Handle multi-line items
    // Normalize formatting
  }

  async classifyLabels(items) {
    // Call LLM API or local classifier
    // Labels: vegan, vegetarian, dairy-free, gluten-free, etc.
    // Confidence scores
  }

  async generateEmbeddings(items) {
    // OpenAI embeddings or sentence-transformers
    // Store in pgvector column
  }

  computeVeggieScore(items) {
    // Algorithm: % vegan items, variety, labeling quality
    // Weight by menu section
    // Return 0-100 score
  }
}
```

---

## Data Model

### Core Tables

#### `places`
```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  website TEXT,
  phone TEXT,
  cuisine_types TEXT[],
  price_level INTEGER,
  rating DECIMAL(2,1),
  veggie_score INTEGER, -- 0-100
  last_crawled_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_veggie_score ON places(veggie_score DESC);
```

#### `menus`
```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  menu_type TEXT, -- 'lunch', 'dinner', 'brunch', 'drinks'
  source_type TEXT, -- 'crawl', 'upload', 'manual'
  source_url TEXT,
  raw_artifact_id UUID REFERENCES raw_artifacts(id),
  parsed_at TIMESTAMPTZ,
  parser_version TEXT,
  confidence_score DECIMAL(3,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menus_place_id ON menus(place_id);
```

#### `menu_items`
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  section TEXT, -- 'appetizers', 'mains', 'desserts', etc.
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  dietary_labels TEXT[], -- ['vegan', 'gf', 'df']
  ingredients TEXT[],
  embedding VECTOR(1536), -- OpenAI ada-002 or similar
  veggie_score INTEGER, -- 0-100 for this item
  source_confidence DECIMAL(3,2),
  processed_by TEXT, -- worker_id
  model_version TEXT,
  raw_provenance UUID REFERENCES raw_artifacts(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX idx_menu_items_embedding ON menu_items USING ivfflat(embedding vector_cosine_ops);
```

### Crawling & Processing Tables

#### `crawl_runs`
```sql
CREATE TABLE crawl_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  status TEXT, -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  found_urls TEXT[],
  robots_respected BOOLEAN DEFAULT TRUE,
  errors JSONB,
  artifacts_count INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_crawl_runs_place_id ON crawl_runs(place_id);
CREATE INDEX idx_crawl_runs_status ON crawl_runs(status);
```

#### `raw_artifacts`
```sql
CREATE TABLE raw_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crawl_run_id UUID REFERENCES crawl_runs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  mime_type TEXT,
  file_size BIGINT,
  content_hash TEXT, -- SHA256
  source_url TEXT,
  http_headers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_artifacts_crawl_run_id ON raw_artifacts(crawl_run_id);
CREATE INDEX idx_raw_artifacts_content_hash ON raw_artifacts(content_hash);
```

#### `jobs`
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL, -- 'crawl', 'ocr', 'parse', 'label'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status_priority ON jobs(status, priority DESC, created_at);
CREATE INDEX idx_jobs_type ON jobs(job_type);
```

### Gamification Tables

#### `points_transactions`
```sql
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'discover_place', 'upload_menu', 'verified_review'
  related_type TEXT, -- 'place', 'menu', 'review'
  related_id UUID,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_created_at ON points_transactions(created_at DESC);
```

#### `user_levels`
```sql
CREATE TABLE user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
  total_points INTEGER DEFAULT 0,
  level_achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_badges`
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'first_discover', 'menu_maven', 'night_owl'
  badge_tier TEXT, -- 'bronze', 'silver', 'gold'
  metadata JSONB, -- badge-specific data
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type, badge_tier)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
```

#### `quests`
```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT, -- 'daily', 'weekly', 'special'
  rules JSONB NOT NULL, -- { action: 'upload_menu', count: 3 }
  reward_points INTEGER NOT NULL,
  reward_badge TEXT,
  active_from TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quests_active ON quests(active_from, expires_at);
```

#### `user_quests`
```sql
CREATE TABLE user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
  progress JSONB, -- { uploads: 2, target: 3 }
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

CREATE INDEX idx_user_quests_user_id_status ON user_quests(user_id, status);
```

#### `leaderboard_cache`
```sql
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL, -- 'global', 'city:NYC', 'friends:user_id'
  timeframe TEXT, -- 'daily', 'weekly', 'monthly', 'all_time'
  payload JSONB NOT NULL, -- [{ user_id, username, points, rank }]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope, timeframe)
);
```

### Admin & Audit Tables

#### `admin_audit_logs`
```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'edit_menu', 'reprocess', 'ban_user'
  resource_type TEXT, -- 'place', 'menu', 'user'
  resource_id UUID,
  before JSONB,
  after JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
```

#### `manual_overrides`
```sql
CREATE TABLE manual_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  field TEXT NOT NULL, -- 'name', 'price', 'dietary_labels'
  original_value JSONB,
  override_value JSONB,
  admin_id UUID REFERENCES auth.users(id),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_overrides_menu_item_id ON manual_overrides(menu_item_id);
```

---

## Processing Pipeline

### End-to-End Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User searches for "vegan restaurants near me"            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Edge Function queries Google Places API                   │
│    - Finds 10 restaurants                                     │
│    - 3 already in DB, 7 new                                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. For each new place:                                        │
│    - INSERT INTO places (google_place_id, name, location...) │
│    - INSERT INTO jobs (job_type='crawl', payload={place_id}) │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. Crawler worker picks up job                               │
│    - Fetches website (checks robots.txt)                     │
│    - Extracts JSON-LD: Menu with 15 items                    │
│    - Downloads 2 PDFs and 5 images                           │
│    - Stores to Supabase Storage                              │
│    - INSERT INTO crawl_runs, raw_artifacts                   │
│    - Enqueues 7 OCR jobs (PDFs + images)                     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. OCR workers process images (parallel)                     │
│    - Preprocess: deskew, denoise                             │
│    - Layout detection: identify menu regions                 │
│    - OCR: extract text with PaddleOCR                        │
│    - Postprocess: parse prices, sections                     │
│    - Store OCR results to Storage                            │
│    - Enqueue parse jobs                                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Parser worker processes OCR output                        │
│    - Combine JSON-LD + OCR results                           │
│    - Extract menu items (name, price, description)           │
│    - INSERT INTO menus, menu_items                           │
│    - Enqueue label job                                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. Labeler worker classifies items                           │
│    - Call LLM API: classify dietary labels                   │
│    - Generate embeddings (OpenAI ada-002)                    │
│    - Compute VeggieScore per item                            │
│    - UPDATE menu_items SET dietary_labels, embedding...      │
│    - Compute place-level VeggieScore                         │
│    - UPDATE places SET veggie_score                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. Award points to discovering user                          │
│    - Edge Function: award_points                             │
│    - Check quality (OCR confidence > 0.8)                    │
│    - Dedupe (perceptual hash check)                          │
│    - INSERT INTO points_transactions (+100 points)           │
│    - Check for badge unlock (First Discover)                 │
│    - INSERT INTO user_badges                                 │
│    - Invalidate leaderboard cache                            │
│    - Send push notification to user                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 9. User sees updated results                                 │
│    - Place now has VeggieScore: 87/100                       │
│    - MunchMatcher: "High match for 🌱 vegan comfort food"   │
│    - +100 points, new badge notification                     │
└──────────────────────────────────────────────────────────────┘
```

### Job Queue Management

#### Redis Queue (Recommended)
```javascript
// Using BullMQ
const { Queue, Worker } = require('bullmq');

const crawlQueue = new Queue('crawl', {
  connection: { host: 'redis', port: 6379 }
});

const ocrQueue = new Queue('ocr', {
  connection: { host: 'redis', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// Enqueue job
await crawlQueue.add('crawl_place', {
  place_id: 'uuid',
  website: 'https://example.com'
}, {
  priority: 10
});

// Worker
const crawlWorker = new Worker('crawl', async (job) => {
  const { place_id, website } = job.data;
  const result = await crawlerPipeline.run(place_id, website);
  return result;
}, { connection: { host: 'redis', port: 6379 } });
```

#### Alternative: Supabase Jobs Table
```javascript
// Poll for jobs
async function pollJobs(jobType) {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('job_type', jobType)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  for (const job of jobs) {
    await processJob(job);
  }
}

async function processJob(job) {
  // Mark as processing
  await supabase
    .from('jobs')
    .update({
      status: 'processing',
      worker_id: WORKER_ID,
      started_at: new Date().toISOString()
    })
    .eq('id', job.id);

  try {
    const result = await executeJob(job);

    // Mark as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
  } catch (error) {
    // Mark as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: error.message,
        attempts: job.attempts + 1
      })
      .eq('id', job.id);
  }
}
```

---

## Gamification System

### Points Economy

#### Point Awards
```javascript
const POINT_VALUES = {
  discover_place: 100,
  upload_menu_photo: 50,
  verified_review: 75,
  correct_parsing: 25,
  share_place: 20,
  daily_login: 10,
  friend_referral: 500,
  quest_completion: (quest) => quest.reward_points
};
```

#### Level Thresholds
```javascript
const LEVELS = {
  bronze: { min: 0, max: 999 },
  silver: { min: 1000, max: 4999 },
  gold: { min: 5000, max: 19999 },
  platinum: { min: 20000, max: Infinity }
};
```

### Badge System

#### Badge Types
```javascript
const BADGES = {
  // Discovery
  first_discover: {
    name: 'First Steps',
    description: 'Discover your first restaurant',
    icon: '🚀',
    condition: (user) => user.places_discovered >= 1
  },

  explorer: {
    name: 'Explorer',
    tiers: {
      bronze: { places_discovered: 10 },
      silver: { places_discovered: 50 },
      gold: { places_discovered: 200 }
    }
  },

  // Menu Uploads
  menu_maven: {
    name: 'Menu Maven',
    tiers: {
      bronze: { menus_uploaded: 5 },
      silver: { menus_uploaded: 25 },
      gold: { menus_uploaded: 100 }
    }
  },

  // Timing
  night_owl: {
    name: 'Night Owl',
    description: 'Upload a menu after 10 PM',
    condition: (upload) => upload.created_at.getHours() >= 22
  },

  early_bird: {
    name: 'Early Bird',
    description: 'Upload a menu before 6 AM',
    condition: (upload) => upload.created_at.getHours() < 6
  },

  // Streaks
  dedicated: {
    name: 'Dedicated',
    tiers: {
      bronze: { streak_days: 7 },
      silver: { streak_days: 30 },
      gold: { streak_days: 100 }
    }
  },

  // Social
  influencer: {
    name: 'Influencer',
    tiers: {
      bronze: { friends_referred: 3 },
      silver: { friends_referred: 10 },
      gold: { friends_referred: 50 }
    }
  }
};
```

### Quest System

#### Quest Templates
```javascript
const QUEST_TEMPLATES = {
  daily_upload: {
    type: 'daily',
    title: 'Daily Menu Hunter',
    description: 'Upload 1 menu photo today',
    rules: { action: 'upload_menu', count: 1 },
    reward_points: 75
  },

  weekly_explorer: {
    type: 'weekly',
    title: 'Weekend Warrior',
    description: 'Discover 5 new restaurants this week',
    rules: { action: 'discover_place', count: 5 },
    reward_points: 500,
    reward_badge: 'weekend_warrior'
  },

  challenge_vegan: {
    type: 'special',
    title: 'Vegan Challenge',
    description: 'Find and review 10 vegan restaurants',
    rules: {
      action: 'verified_review',
      count: 10,
      filter: { veggie_score: { gte: 80 } }
    },
    reward_points: 1000,
    reward_badge: 'vegan_champion'
  }
};

// Generate daily quests
async function generateDailyQuests() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await supabase.from('quests').insert([
    {
      ...QUEST_TEMPLATES.daily_upload,
      active_from: today.toISOString(),
      expires_at: tomorrow.toISOString()
    }
  ]);
}
```

### Anti-Abuse Measures

#### Duplicate Detection
```javascript
async function checkDuplicateUpload(imageBuffer, userId) {
  // Compute perceptual hash
  const phash = await computePerceptualHash(imageBuffer);

  // Check for similar uploads
  const { data: existing } = await supabase
    .from('menu_uploads')
    .select('id, perceptual_hash')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24h

  for (const upload of existing) {
    const similarity = hammingDistance(phash, upload.perceptual_hash);
    if (similarity < 5) { // Very similar
      return { duplicate: true, original_id: upload.id };
    }
  }

  return { duplicate: false };
}
```

#### Rate Limiting
```javascript
const RATE_LIMITS = {
  discover_place: { max: 50, window: '1 hour' },
  upload_menu: { max: 20, window: '1 hour' },
  verified_review: { max: 10, window: '1 day' }
};

async function checkRateLimit(userId, action) {
  const window = RATE_LIMITS[action].window;
  const max = RATE_LIMITS[action].max;

  const { count } = await supabase
    .from('points_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reason', action)
    .gte('created_at', getWindowStart(window));

  if (count >= max) {
    throw new Error(`Rate limit exceeded for ${action}`);
  }
}
```

### Leaderboard Generation

```javascript
async function updateLeaderboard(scope = 'global', timeframe = 'all_time') {
  let query = supabase
    .from('points_transactions')
    .select('user_id, users(username, avatar_url)');

  // Apply timeframe filter
  if (timeframe !== 'all_time') {
    const start = getTimeframeStart(timeframe);
    query = query.gte('created_at', start.toISOString());
  }

  // Apply scope filter
  if (scope.startsWith('city:')) {
    const city = scope.split(':')[1];
    query = query.eq('metadata->>city', city);
  }

  const { data } = await query;

  // Aggregate points
  const leaderboard = data.reduce((acc, row) => {
    const userId = row.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        username: row.users.username,
        avatar_url: row.users.avatar_url,
        points: 0
      };
    }
    acc[userId].points += row.points;
    return acc;
  }, {});

  // Sort and rank
  const sorted = Object.values(leaderboard)
    .sort((a, b) => b.points - a.points)
    .slice(0, 100)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  // Cache result
  await supabase
    .from('leaderboard_cache')
    .upsert({
      scope,
      timeframe,
      payload: sorted,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'scope,timeframe'
    });

  return sorted;
}
```

---

## Admin & Security

### Admin Authentication

#### SSO Setup (Auth0 Example)
```javascript
// Next.js API route: /api/auth/[...auth0].js
import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export default handleAuth({
  login: handleLogin({
    returnTo: '/admin',
    authorizationParams: {
      prompt: 'login',
      acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor'
    }
  })
});

// Middleware: /middleware.js
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: '/admin/:path*'
};
```

#### RBAC Implementation
```javascript
const ROLES = {
  admin: ['*'], // All permissions
  moderator: ['view:places', 'edit:menus', 'ban:users'],
  content_editor: ['view:places', 'edit:menus'],
  data_ops: ['view:jobs', 'trigger:reprocess']
};

async function checkPermission(userId, permission) {
  const { data: user } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single();

  const allowedPermissions = ROLES[user.role] || [];

  if (allowedPermissions.includes('*')) return true;
  if (allowedPermissions.includes(permission)) return true;

  throw new Error('Insufficient permissions');
}

// Edge Function with RBAC
export async function handler(req: Request) {
  const user = await getUser(req);
  await checkPermission(user.id, 'edit:menus');

  // Proceed with admin action
}
```

### Admin Features

#### Place Management
```typescript
// Admin API: GET /admin/places/:id
interface PlaceAdminView {
  place: Place;
  crawl_runs: CrawlRun[];
  menus: Menu[];
  parsed_items_count: number;
  manual_overrides: ManualOverride[];
  claim_status: 'unclaimed' | 'pending' | 'verified';
  opt_out_status: boolean;
}

// Admin API: POST /admin/places/:id/reprocess
async function triggerReprocess(placeId: string, adminId: string) {
  // Log audit trail
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action: 'reprocess',
    resource_type: 'place',
    resource_id: placeId,
    reason: 'Manual reprocess requested'
  });

  // Clear existing menus
  await supabase
    .from('menus')
    .update({ archived: true })
    .eq('place_id', placeId);

  // Enqueue new crawl
  await supabase.from('jobs').insert({
    job_type: 'crawl',
    payload: { place_id: placeId, force: true },
    priority: 100 // High priority
  });
}
```

#### Menu Editor
```typescript
// React component with WYSIWYG editor
function MenuEditor({ menuId }: { menuId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);

  async function saveOverride(itemId: string, field: string, newValue: any) {
    const item = items.find(i => i.id === itemId);

    // Create manual override
    await supabase.from('manual_overrides').insert({
      menu_item_id: itemId,
      field,
      original_value: item[field],
      override_value: newValue,
      admin_id: currentAdmin.id,
      reason: 'Manual correction from admin panel'
    });

    // Update menu item
    await supabase
      .from('menu_items')
      .update({ [field]: newValue })
      .eq('id', itemId);

    // Log audit trail
    await supabase.from('admin_audit_logs').insert({
      admin_id: currentAdmin.id,
      action: 'edit_menu_item',
      resource_type: 'menu_item',
      resource_id: itemId,
      before: { [field]: item[field] },
      after: { [field]: newValue }
    });
  }

  return (
    <div>
      {items.map(item => (
        <MenuItemEditor
          key={item.id}
          item={item}
          onSave={saveOverride}
        />
      ))}
    </div>
  );
}
```

#### User Management
```typescript
// Admin API: GET /admin/users/:id
interface UserAdminView {
  user: User;
  total_points: number;
  level: string;
  badges: Badge[];
  recent_activity: Activity[];
  flags: {
    suspicious_uploads: number;
    spam_reports: number;
  };
}

// Admin API: POST /admin/users/:id/ban
async function banUser(userId: string, adminId: string, reason: string) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action: 'ban_user',
    resource_type: 'user',
    resource_id: userId,
    reason
  });

  await supabase
    .from('user_restrictions')
    .insert({
      user_id: userId,
      restriction_type: 'ban',
      reason,
      expires_at: null // Permanent
    });

  // Revoke sessions
  await supabase.auth.admin.deleteUser(userId);
}
```

### Restaurant Claim/Opt-Out Workflow

```typescript
// Public API: POST /api/restaurants/:id/claim
async function initiateRestaurantClaim(placeId: string, email: string) {
  // Send verification email
  const token = generateSecureToken();

  await supabase.from('restaurant_claims').insert({
    place_id: placeId,
    claimant_email: email,
    verification_token: token,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  await sendEmail({
    to: email,
    subject: 'Verify your restaurant claim',
    template: 'verify_claim',
    data: {
      verification_link: `${SITE_URL}/verify-claim/${token}`
    }
  });
}

// Public API: GET /api/verify-claim/:token
async function verifyRestaurantClaim(token: string) {
  const { data: claim } = await supabase
    .from('restaurant_claims')
    .select('*')
    .eq('verification_token', token)
    .eq('status', 'pending')
    .single();

  if (!claim || new Date() > new Date(claim.expires_at)) {
    throw new Error('Invalid or expired token');
  }

  // Mark as verified, notify admins for approval
  await supabase
    .from('restaurant_claims')
    .update({ status: 'verified' })
    .eq('id', claim.id);

  // Create admin task
  await notifyAdmins('New restaurant claim awaiting approval', {
    claim_id: claim.id,
    place_id: claim.place_id
  });
}

// Admin approval
async function approveRestaurantClaim(claimId: string, adminId: string) {
  const { data: claim } = await supabase
    .from('restaurant_claims')
    .select('*')
    .eq('id', claimId)
    .single();

  await supabase
    .from('restaurant_claims')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString()
    })
    .eq('id', claimId);

  // Grant restaurant owner access
  await supabase.from('restaurant_owners').insert({
    place_id: claim.place_id,
    owner_email: claim.claimant_email
  });

  await sendEmail({
    to: claim.claimant_email,
    subject: 'Your restaurant claim has been approved',
    template: 'claim_approved'
  });
}

// Opt-out flow
async function optOutRestaurant(placeId: string, email: string, reason: string) {
  await supabase.from('restaurant_opt_outs').insert({
    place_id: placeId,
    requester_email: email,
    reason,
    status: 'pending'
  });

  // Immediately stop crawling
  await supabase
    .from('places')
    .update({ crawl_enabled: false })
    .eq('id', placeId);

  // Notify admins
  await notifyAdmins('Restaurant opt-out request', {
    place_id: placeId,
    email,
    reason
  });
}
```

---

## Development Phases

### Phase 0: Infrastructure & Foundations (Weeks 1-2)

#### Goals
- Set up Supabase project
- Configure database schema
- Set up worker infrastructure
- Implement basic authentication

#### Tasks
1. **Supabase Setup**
   ```bash
   # Create project
   npx supabase init
   npx supabase start

   # Enable extensions
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS postgis;

   # Run migrations
   npx supabase db push
   ```

2. **Database Schema**
   - Create all tables (places, menus, menu_items, etc.)
   - Set up RLS policies
   - Create indexes for performance
   - Test with seed data

3. **Worker Infrastructure**
   ```bash
   # Docker Compose for local development
   docker-compose up -d redis postgres

   # For production: Kubernetes manifests
   kubectl apply -f k8s/workers/
   ```

4. **Basic Edge Functions**
   - `search_places`: Placeholder implementation
   - `discover_place`: Create place + enqueue job
   - `get_place`: Return place details

#### Deliverables
- ✅ Supabase project configured
- ✅ Database schema deployed
- ✅ Worker infrastructure running
- ✅ Basic API endpoints functional

---

### Phase 1: Crawler + OCR Workers (Weeks 3-5)

#### Goals
- Build web crawler service
- Implement OCR pipeline
- Store artifacts in Supabase Storage
- Process first real menu

#### Tasks
1. **Crawler Service**
   ```javascript
   // src/crawler/index.js
   const crawler = {
     async crawlPlace(placeId, website) {
       // 1. Check robots.txt
       // 2. Fetch homepage
       // 3. Extract menu links
       // 4. Parse JSON-LD/Microdata
       // 5. Download PDFs/images
       // 6. Store artifacts
       // 7. Enqueue OCR jobs
     }
   };
   ```

2. **OCR Worker**
   ```python
   # src/ocr/worker.py
   class OCRWorker:
       def process_image(self, image_path):
           # 1. Preprocess with OpenCV
           # 2. Layout detection
           # 3. PaddleOCR extraction
           # 4. Postprocess
           # 5. Return structured JSON
   ```

3. **Storage Integration**
   ```javascript
   // Store artifacts
   const { data, error } = await supabase.storage
     .from('menus')
     .upload(`${placeId}/${filename}`, fileBuffer);

   // Store reference in DB
   await supabase.from('raw_artifacts').insert({
     crawl_run_id,
     storage_path: data.path,
     mime_type: 'application/pdf',
     content_hash: sha256(fileBuffer)
   });
   ```

4. **Testing & Validation**
   - Test with 10 diverse restaurants
   - Measure OCR accuracy
   - Tune preprocessing parameters

#### Deliverables
- ✅ Crawler service deployed
- ✅ OCR workers running (3+ instances)
- ✅ First 10 restaurants fully processed
- ✅ OCR accuracy > 85%

---

### Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

#### Goals
- Parse OCR output into menu items
- Implement AI classifier for dietary labels
- Build admin dashboard
- Enable manual corrections

#### Tasks
1. **Parser Service**
   ```javascript
   // src/parser/index.js
   async function parseMenu(ocrText, sections) {
     const items = extractItems(ocrText);
     const structured = items.map(item => ({
       name: extractName(item),
       price: extractPrice(item),
       description: extractDescription(item),
       section: classifySection(item, sections)
     }));
     return structured;
   }
   ```

2. **AI Classifier**
   ```python
   # src/classifier/labels.py
   def classify_dietary_labels(item_text: str) -> list[str]:
       # Option 1: Rule-based
       labels = []
       if any(word in item_text.lower() for word in ['vegan', 'plant-based']):
           labels.append('vegan')

       # Option 2: LLM API
       response = openai.ChatCompletion.create(
           model='gpt-4',
           messages=[{
               'role': 'user',
               'content': f'Classify dietary labels for: {item_text}'
           }]
       )

       return labels
   ```

3. **Admin Dashboard (Next.js)**
   ```typescript
   // pages/admin/places/[id].tsx
   export default function PlaceAdmin() {
     const { id } = useRouter().query;
     const { place, menus } = usePlaceAdmin(id);

     return (
       <AdminLayout>
         <PlaceOverview place={place} />
         <MenuList menus={menus} />
         <ReprocessButton placeId={id} />
         <AuditLog placeId={id} />
       </AdminLayout>
     );
   }
   ```

4. **Manual Override System**
   - UI for editing menu items
   - Audit logging
   - Approval workflow (optional)

#### Deliverables
- ✅ Parser service deployed
- ✅ AI classifier integrated (rule-based + LLM fallback)
- ✅ Admin dashboard live
- ✅ Manual corrections functional

---

### Phase 3: Gamification + UX (Weeks 9-11)

#### Goals
- Implement points/badges/quests system
- Build mobile app (Expo)
- Create leaderboards
- Launch beta with 50 users

#### Tasks
1. **Gamification Backend**
   ```javascript
   // Edge Function: award_points
   export async function awardPoints(userId, action, metadata) {
     // 1. Validate action
     // 2. Check rate limits
     // 3. Check for duplicates
     // 4. Award points
     // 5. Check badge unlocks
     // 6. Update quest progress
     // 7. Invalidate leaderboard cache
     // 8. Send notification
   }
   ```

2. **Mobile App (Expo)**
   ```typescript
   // app/(tabs)/search.tsx
   export default function SearchScreen() {
     const [results, setResults] = useState([]);

     async function search(query) {
       const { data } = await supabase.rpc('search_places', {
         query_text: query,
         user_location: location
       });
       setResults(data);
     }

     return (
       <View>
         <SearchBar onSearch={search} />
         <RestaurantList results={results} />
       </View>
     );
   }
   ```

3. **Leaderboards**
   - Global leaderboard
   - City leaderboards
   - Friends leaderboard
   - Real-time updates

4. **Beta Launch**
   - Onboard 50 beta users
   - Collect feedback
   - Track engagement metrics

#### Deliverables
- ✅ Gamification system live
- ✅ Mobile app (iOS + Android) in TestFlight/Play Console
- ✅ 50 beta users onboarded
- ✅ Engagement metrics dashboard

---

### Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

#### Goals
- Generate embeddings for menu items
- Implement craving-based search
- Improve VeggieScore algorithm
- Optimize SEO

#### Tasks
1. **Embeddings Pipeline**
   ```python
   # src/embeddings/generator.py
   import openai

   def generate_embeddings(items: list[MenuItem]):
       texts = [f"{item.name} {item.description}" for item in items]

       response = openai.Embedding.create(
           model='text-embedding-ada-002',
           input=texts
       )

       for i, item in enumerate(items):
           embedding = response['data'][i]['embedding']
           # Store in pgvector
           supabase.from('menu_items').update({
               'embedding': embedding
           }).eq('id', item.id).execute()
   ```

2. **Craving Search**
   ```sql
   -- Create search function
   CREATE OR REPLACE FUNCTION search_by_craving(
     craving_text TEXT,
     user_location GEOGRAPHY,
     max_distance FLOAT DEFAULT 5000
   )
   RETURNS TABLE (
     place_id UUID,
     place_name TEXT,
     match_score FLOAT,
     matched_items JSONB
   ) AS $$
   BEGIN
     -- 1. Generate embedding for craving
     -- 2. Vector similarity search on menu_items
     -- 3. Group by place
     -- 4. Rank by match + distance
     RETURN QUERY
     SELECT
       p.id,
       p.name,
       AVG(1 - (mi.embedding <=> craving_embedding)) AS match_score,
       JSONB_AGG(mi.*) AS matched_items
     FROM places p
     JOIN menus m ON m.place_id = p.id
     JOIN menu_items mi ON mi.menu_id = m.id
     WHERE ST_DWithin(p.location, user_location, max_distance)
     ORDER BY match_score DESC
     LIMIT 20;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **VeggieScore v2**
   ```javascript
   function computeVeggieScore(menuItems) {
     const totalItems = menuItems.length;
     const veganItems = menuItems.filter(i => i.dietary_labels.includes('vegan'));
     const vegetarianItems = menuItems.filter(i => i.dietary_labels.includes('vegetarian'));

     // Weighted scoring
     const veganScore = (veganItems.length / totalItems) * 100;
     const vegetarianScore = (vegetarianItems.length / totalItems) * 50;
     const varietyBonus = calculateVariety(menuItems) * 10;
     const labelQualityBonus = calculateLabelQuality(menuItems) * 5;

     return Math.min(100, veganScore + vegetarianScore + varietyBonus + labelQualityBonus);
   }
   ```

4. **SEO Optimization**
   - Generate static pages for top restaurants
   - Add structured data (JSON-LD)
   - Optimize meta tags
   - Create sitemap

#### Deliverables
- ✅ Embeddings generated for all menu items
- ✅ Craving search functional
- ✅ VeggieScore v2 deployed
- ✅ SEO score > 90 on Lighthouse

---

### Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

#### Goals
- Deploy autoscaling infrastructure
- Add monitoring & alerting
- Implement A/B testing
- Prepare for public launch

#### Tasks
1. **Autoscaling Workers**
   ```yaml
   # k8s/workers/hpa.yaml
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
   ```

2. **Monitoring**
   ```javascript
   // Prometheus metrics
   const httpRequestDuration = new prometheus.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status_code']
   });

   // Sentry error tracking
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     tracesSampleRate: 0.1
   });
   ```

3. **A/B Testing**
   ```javascript
   // Experiment: VeggieScore display prominence
   const experiment = {
     name: 'veggie_score_prominence',
     variants: {
       control: { showInCard: false },
       treatment: { showInCard: true }
     }
   };

   function getVariant(userId) {
     const hash = hashUserId(userId);
     return hash % 2 === 0 ? 'control' : 'treatment';
   }
   ```

4. **Performance Optimization**
   - Database query optimization
   - Edge caching (Cloudflare/Fastly)
   - Image optimization (WebP, lazy loading)
   - Code splitting

#### Deliverables
- ✅ Infrastructure autoscaling enabled
- ✅ Monitoring & alerting configured
- ✅ A/B testing framework live
- ✅ Performance: p95 < 500ms

---

## Operational Guidelines

### OCR Stack Recommendations

#### Option 1: PaddleOCR (Recommended)
```bash
# Install
pip install paddlepaddle paddleocr

# Usage
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr(image_path)

# Pros: High accuracy, multilingual, fast
# Cons: Larger model size
```

#### Option 2: Tesseract
```bash
# Install
apt-get install tesseract-ocr

# Usage
import pytesseract

text = pytesseract.image_to_string(image)

# Pros: Very mature, lightweight
# Cons: Lower accuracy on complex layouts
```

#### Option 3: Hybrid Approach
```python
def ocr_with_fallback(image):
    # Try PaddleOCR first
    result = paddle_ocr(image)

    if result.confidence < 0.8:
        # Fallback to Tesseract
        result = tesseract_ocr(image)

    return result
```

### Worker Orchestration

#### Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocr-worker
spec:
  replicas: 5
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

#### Docker Compose (Development)
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ocr-worker:
    build: ./src/ocr
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    volumes:
      - ./tmp:/tmp
    deploy:
      replicas: 3
```

### Cost Optimization

#### OCR Processing
- **Self-hosted**: $0.10-0.20 per 1000 images (compute + storage)
- **Cloud OCR (Google Vision)**: $1.50 per 1000 images
- **Savings**: ~90% by self-hosting

#### Caching Strategy
```javascript
// Cache parsed menus for 30 days
const CACHE_TTL = 30 * 24 * 60 * 60;

async function getMenu(menuId) {
  // Check cache first
  const cached = await redis.get(`menu:${menuId}`);
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const menu = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('id', menuId)
    .single();

  // Cache result
  await redis.setex(`menu:${menuId}`, CACHE_TTL, JSON.stringify(menu));

  return menu;
}
```

### Legal & Compliance

#### Robots.txt Compliance
```javascript
const robotsParser = require('robots-parser');

async function canCrawl(url) {
  const robotsUrl = new URL('/robots.txt', url).href;
  const robotsTxt = await fetch(robotsUrl).then(r => r.text());

  const robots = robotsParser(robotsUrl, robotsTxt);
  return robots.isAllowed(url, 'VeggieScoreBot');
}
```

#### Terms of Service
```markdown
## Data Collection
- We crawl publicly available restaurant websites
- We respect robots.txt directives
- Restaurant owners can opt-out anytime

## User Contributions
- By uploading menus, you grant us a license to use the content
- You represent that you have the right to share the content
```

#### GDPR Compliance
- User data export API
- Right to be forgotten (delete account)
- Cookie consent banner
- Privacy policy with data retention details

### Monitoring Metrics

#### System Health
- **OCR Success Rate**: % of images successfully processed
- **Parser Accuracy**: % of menu items correctly extracted
- **Crawler Coverage**: % of restaurants with up-to-date menus
- **API Latency**: p50, p95, p99 response times
- **Worker Queue Depth**: Number of pending jobs

#### Business Metrics
- **DAU/MAU**: Daily/monthly active users
- **Discovery Rate**: New restaurants per day
- **User Contributions**: Uploads, reviews, shares per user
- **Quest Completion**: % of users completing daily/weekly quests
- **Retention**: Day 1, Day 7, Day 30 retention rates

#### Alerting Rules
```yaml
# Prometheus alerting rules
groups:
- name: veggiescore
  rules:
  - alert: HighOCRFailureRate
    expr: rate(ocr_failures_total[5m]) > 0.2
    annotations:
      summary: "OCR failure rate above 20%"

  - alert: WorkerQueueBacklog
    expr: redis_queue_length > 1000
    annotations:
      summary: "Worker queue has >1000 pending jobs"
```

---

## Summary

This development plan outlines a comprehensive approach to building VeggieScore/MunchMatcher:

1. **Phase 0**: Infrastructure setup (2 weeks)
2. **Phase 1**: Crawler + OCR (3 weeks)
3. **Phase 2**: Parsing + Admin (3 weeks)
4. **Phase 3**: Gamification + UX (3 weeks)
5. **Phase 4**: Embeddings + Search (3 weeks)
6. **Phase 5**: Hardening + Launch (2 weeks)

**Total timeline**: 16 weeks (4 months)

### Key Success Factors
- ✅ Self-hosted OCR for cost efficiency
- ✅ Strong gamification for user engagement
- ✅ Comprehensive admin tools for quality control
- ✅ Legal compliance (robots.txt, opt-out flows)
- ✅ Scalable infrastructure from day one

### Next Steps
1. Review and approve this plan
2. Set up Supabase project (Phase 0)
3. Recruit beta testers
4. Begin Phase 0 implementation

**Let's build something amazing!** 🚀🌱
