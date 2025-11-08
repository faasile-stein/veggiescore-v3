-- Crawling & Processing Tables
-- Tables for tracking crawl runs, artifacts, and job queue

-- =====================================================
-- CRAWL_RUNS TABLE
-- =====================================================
CREATE TABLE crawl_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  found_urls TEXT[] DEFAULT '{}',
  robots_respected BOOLEAN DEFAULT TRUE,
  errors JSONB DEFAULT '[]'::jsonb,
  artifacts_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_crawl_runs_place_id ON crawl_runs(place_id);
CREATE INDEX idx_crawl_runs_status ON crawl_runs(status);
CREATE INDEX idx_crawl_runs_started_at ON crawl_runs(started_at DESC);

-- Comments
COMMENT ON TABLE crawl_runs IS 'Tracking of website crawl executions';
COMMENT ON COLUMN crawl_runs.robots_respected IS 'Whether robots.txt was checked and respected';

-- =====================================================
-- RAW_ARTIFACTS TABLE
-- =====================================================
CREATE TABLE raw_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crawl_run_id UUID REFERENCES crawl_runs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  mime_type TEXT,
  file_size BIGINT,
  content_hash TEXT, -- SHA256
  source_url TEXT,
  http_headers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_raw_artifacts_crawl_run_id ON raw_artifacts(crawl_run_id);
CREATE INDEX idx_raw_artifacts_content_hash ON raw_artifacts(content_hash);
CREATE INDEX idx_raw_artifacts_mime_type ON raw_artifacts(mime_type);

-- Comments
COMMENT ON TABLE raw_artifacts IS 'Storage references for crawled files (PDFs, images, HTML)';
COMMENT ON COLUMN raw_artifacts.content_hash IS 'SHA256 hash for deduplication';

-- =====================================================
-- JOBS TABLE
-- =====================================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CHECK (job_type IN ('crawl', 'ocr', 'parse', 'label'))
);

-- Indexes
CREATE INDEX idx_jobs_status_priority ON jobs(status, priority DESC, created_at) WHERE status = 'pending';
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_worker_id ON jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Comments
COMMENT ON TABLE jobs IS 'Job queue for asynchronous processing tasks';
COMMENT ON COLUMN jobs.priority IS 'Higher priority jobs processed first';

-- =====================================================
-- FOREIGN KEY FOR MENUS
-- =====================================================
-- Add the foreign key constraint we couldn't add earlier
ALTER TABLE menus
  ADD CONSTRAINT fk_menus_raw_artifact
  FOREIGN KEY (raw_artifact_id) REFERENCES raw_artifacts(id) ON DELETE SET NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_crawl_runs_updated_at BEFORE UPDATE ON crawl_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update artifacts_count when artifacts are inserted
CREATE OR REPLACE FUNCTION update_crawl_artifacts_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE crawl_runs
    SET artifacts_count = artifacts_count + 1
    WHERE id = NEW.crawl_run_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artifacts_count AFTER INSERT ON raw_artifacts
    FOR EACH ROW EXECUTE FUNCTION update_crawl_artifacts_count();
