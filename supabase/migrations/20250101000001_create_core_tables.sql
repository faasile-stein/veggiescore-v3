-- Core Tables: places, menus, menu_items
-- These tables store the primary restaurant and menu data

-- =====================================================
-- PLACES TABLE
-- =====================================================
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  website TEXT,
  phone TEXT,
  cuisine_types TEXT[],
  price_level INTEGER CHECK (price_level BETWEEN 1 AND 4),
  rating DECIMAL(2,1) CHECK (rating BETWEEN 0 AND 5),
  veggie_score INTEGER CHECK (veggie_score BETWEEN 0 AND 100),
  last_crawled_at TIMESTAMPTZ,
  crawl_enabled BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for places
CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_veggie_score ON places(veggie_score DESC) WHERE veggie_score IS NOT NULL;
CREATE INDEX idx_places_google_place_id ON places(google_place_id);
CREATE INDEX idx_places_created_at ON places(created_at DESC);

-- Comments
COMMENT ON TABLE places IS 'Restaurant and place information';
COMMENT ON COLUMN places.veggie_score IS 'VeggieScore: 0-100, higher means more vegan/vegetarian options';
COMMENT ON COLUMN places.crawl_enabled IS 'Whether this place is allowed to be crawled';

-- =====================================================
-- MENUS TABLE
-- =====================================================
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  menu_type TEXT DEFAULT 'general', -- 'lunch', 'dinner', 'brunch', 'drinks', 'general'
  source_type TEXT NOT NULL, -- 'crawl', 'upload', 'manual'
  source_url TEXT,
  raw_artifact_id UUID, -- References raw_artifacts, but created later
  parsed_at TIMESTAMPTZ,
  parser_version TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for menus
CREATE INDEX idx_menus_place_id ON menus(place_id);
CREATE INDEX idx_menus_source_type ON menus(source_type);
CREATE INDEX idx_menus_created_at ON menus(created_at DESC);
CREATE INDEX idx_menus_active ON menus(place_id, archived) WHERE archived = FALSE;

-- Comments
COMMENT ON TABLE menus IS 'Menu metadata and processing information';
COMMENT ON COLUMN menus.confidence_score IS 'OCR/parsing confidence: 0-1';

-- =====================================================
-- MENU_ITEMS TABLE
-- =====================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  section TEXT, -- 'appetizers', 'mains', 'desserts', 'drinks', etc.
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  dietary_labels TEXT[] DEFAULT '{}', -- ['vegan', 'vegetarian', 'gf', 'df']
  ingredients TEXT[] DEFAULT '{}',
  embedding VECTOR(1536), -- OpenAI ada-002 or similar
  veggie_score INTEGER CHECK (veggie_score BETWEEN 0 AND 100),
  source_confidence DECIMAL(3,2) CHECK (source_confidence BETWEEN 0 AND 1),
  processed_by TEXT, -- worker_id or 'manual'
  model_version TEXT,
  raw_provenance UUID, -- References raw_artifacts
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX idx_menu_items_dietary_labels ON menu_items USING GIN(dietary_labels);
CREATE INDEX idx_menu_items_section ON menu_items(section);
-- Vector index will be added after items are inserted
-- CREATE INDEX idx_menu_items_embedding ON menu_items USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- Comments
COMMENT ON TABLE menu_items IS 'Individual menu items with parsed data and embeddings';
COMMENT ON COLUMN menu_items.embedding IS 'Vector embedding for semantic search (1536 dimensions)';
COMMENT ON COLUMN menu_items.dietary_labels IS 'Array of dietary labels: vegan, vegetarian, gf, df, etc.';

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
