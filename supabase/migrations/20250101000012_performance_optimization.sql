-- Performance Optimization
-- Phase 5: Database Performance Tuning

-- Additional indexes for common queries
-- Places table optimizations
CREATE INDEX IF NOT EXISTS idx_places_veggie_score_location ON places
USING GIST(location)
WHERE veggie_score > 50;

CREATE INDEX IF NOT EXISTS idx_places_updated_at ON places(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places
USING GIN (name gin_trgm_ops);  -- For fast LIKE/ILIKE queries

-- Menu items optimizations
CREATE INDEX IF NOT EXISTS idx_menu_items_dietary_labels ON menu_items
USING GIN (dietary_labels);

CREATE INDEX IF NOT EXISTS idx_menu_items_price ON menu_items(price)
WHERE price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_section ON menu_items(section)
WHERE section IS NOT NULL;

-- Search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query_type, created_at DESC);

-- Crawl runs
CREATE INDEX IF NOT EXISTS idx_crawl_runs_place_status ON crawl_runs(place_id, status, started_at DESC);

-- Points transactions
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_created ON points_transactions(user_id, created_at DESC);

-- Leaderboard cache
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_scope_timeframe ON leaderboard_cache(scope, timeframe, updated_at DESC);

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Materialized views for expensive queries

-- Popular places materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_places AS
SELECT
    p.id,
    p.name,
    p.address,
    p.veggie_score,
    p.location,
    COUNT(DISTINCT sa.user_id) AS search_appearances,
    COUNT(DISTINCT pt.user_id) AS discoveries,
    AVG(p.veggie_score) AS avg_score
FROM places p
LEFT JOIN search_analytics sa ON sa.clicked_place_id = p.id
LEFT JOIN points_transactions pt ON pt.metadata->>'place_id' = p.id::TEXT
WHERE p.veggie_score >= 50
GROUP BY p.id
ORDER BY search_appearances DESC, discoveries DESC
LIMIT 1000;

CREATE UNIQUE INDEX ON mv_popular_places(id);
CREATE INDEX ON mv_popular_places(veggie_score DESC, discoveries DESC);

COMMENT ON MATERIALIZED VIEW mv_popular_places IS 'Top 1000 popular places by search and discovery activity';

-- Top menu items materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_menu_items AS
SELECT
    mi.id,
    mi.name,
    mi.description,
    mi.dietary_labels,
    mi.veggie_score,
    p.name AS place_name,
    p.id AS place_id,
    COUNT(*) AS search_hits
FROM menu_items mi
JOIN menus m ON m.id = mi.menu_id
JOIN places p ON p.id = m.place_id
WHERE 'vegan' = ANY(mi.dietary_labels)
GROUP BY mi.id, mi.name, mi.description, mi.dietary_labels, mi.veggie_score, p.name, p.id
ORDER BY search_hits DESC
LIMIT 500;

CREATE UNIQUE INDEX ON mv_top_menu_items(id);
CREATE INDEX ON mv_top_menu_items USING GIN(dietary_labels);

COMMENT ON MATERIALIZED VIEW mv_top_menu_items IS 'Top 500 vegan menu items by search popularity';

-- Function to refresh materialized views (call daily)
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_places;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_menu_items;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_performance_views IS 'Refresh all performance materialized views';

-- Optimized search function with caching
CREATE OR REPLACE FUNCTION search_places_optimized(
    p_query TEXT,
    p_latitude FLOAT DEFAULT NULL,
    p_longitude FLOAT DEFAULT NULL,
    p_max_distance FLOAT DEFAULT 5000,
    p_min_veggie_score INT DEFAULT 0,
    p_dietary_filters TEXT[] DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    place_id UUID,
    place_name TEXT,
    address TEXT,
    veggie_score INT,
    distance FLOAT,
    relevance_score FLOAT
) AS $$
DECLARE
    v_user_location GEOGRAPHY;
BEGIN
    -- Create user location if provided
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        v_user_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY;
    END IF;

    RETURN QUERY
    SELECT
        p.id AS place_id,
        p.name AS place_name,
        p.address,
        p.veggie_score,
        CASE
            WHEN v_user_location IS NOT NULL THEN
                ST_Distance(p.location, v_user_location)
            ELSE NULL
        END AS distance,
        -- Relevance score combines text similarity and VeggieScore
        (
            SIMILARITY(p.name, p_query) * 0.6 +
            (p.veggie_score / 100.0) * 0.4
        ) AS relevance_score
    FROM places p
    WHERE
        p.veggie_score >= p_min_veggie_score
        AND (
            p_query IS NULL OR
            p.name ILIKE '%' || p_query || '%' OR
            SIMILARITY(p.name, p_query) > 0.3
        )
        AND (
            v_user_location IS NULL OR
            ST_DWithin(p.location, v_user_location, p_max_distance)
        )
        AND (
            p_dietary_filters IS NULL OR
            EXISTS (
                SELECT 1
                FROM menus m
                JOIN menu_items mi ON mi.menu_id = m.id
                WHERE m.place_id = p.id
                    AND mi.dietary_labels && p_dietary_filters
            )
        )
    ORDER BY
        relevance_score DESC,
        CASE
            WHEN v_user_location IS NOT NULL THEN
                ST_Distance(p.location, v_user_location)
            ELSE 999999
        END ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_places_optimized IS 'Optimized place search with text similarity and geographic filtering';

-- Connection pooling configuration (set via ALTER SYSTEM)
-- These should be run by DBA, included here as documentation
/*
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '10MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
-- Then reload: SELECT pg_reload_conf();
*/

-- Vacuum and analyze schedule
-- Run via pg_cron (requires pg_cron extension)
/*
SELECT cron.schedule('vacuum-analyze-places', '0 2 * * *',
    'VACUUM ANALYZE places');
SELECT cron.schedule('vacuum-analyze-menu-items', '0 3 * * *',
    'VACUUM ANALYZE menu_items');
SELECT cron.schedule('refresh-mv', '0 4 * * *',
    'SELECT refresh_performance_views()');
*/

-- Query performance monitoring view
CREATE OR REPLACE VIEW query_performance AS
SELECT
    query,
    calls,
    total_time / 1000 AS total_seconds,
    mean_time / 1000 AS mean_seconds,
    max_time / 1000 AS max_seconds,
    stddev_time / 1000 AS stddev_seconds,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 50;

COMMENT ON VIEW query_performance IS 'Top 50 queries by total execution time';
