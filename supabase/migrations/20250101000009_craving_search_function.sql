-- Craving Search Function
-- Phase 4: MunchMatcher - Semantic Search

-- Main craving search function
CREATE OR REPLACE FUNCTION search_by_craving(
    craving_embedding TEXT,  -- JSON string of embedding array
    user_latitude FLOAT DEFAULT NULL,
    user_longitude FLOAT DEFAULT NULL,
    max_distance FLOAT DEFAULT 5000,  -- meters
    dietary_filters TEXT[] DEFAULT NULL,
    min_veggie_score INT DEFAULT 0,
    result_limit INT DEFAULT 20
)
RETURNS TABLE (
    place_id UUID,
    place_name TEXT,
    place_address TEXT,
    veggie_score INT,
    distance FLOAT,
    match_score FLOAT,
    matched_items JSONB
) AS $$
DECLARE
    v_embedding VECTOR(1536);
    v_user_location GEOGRAPHY;
BEGIN
    -- Parse embedding from JSON string
    v_embedding := craving_embedding::VECTOR(1536);

    -- Create user location if provided
    IF user_latitude IS NOT NULL AND user_longitude IS NOT NULL THEN
        v_user_location := ST_SetSRID(ST_MakePoint(user_longitude, user_latitude), 4326)::GEOGRAPHY;
    END IF;

    RETURN QUERY
    WITH item_matches AS (
        -- Find matching menu items by embedding similarity
        SELECT
            mi.id AS item_id,
            mi.name AS item_name,
            mi.description AS item_description,
            mi.price,
            mi.currency,
            mi.dietary_labels,
            m.id AS menu_id,
            m.place_id,
            1 - (mi.embedding <=> v_embedding) AS similarity
        FROM menu_items mi
        JOIN menus m ON m.id = mi.menu_id
        WHERE mi.embedding IS NOT NULL
            AND (dietary_filters IS NULL OR mi.dietary_labels && dietary_filters)
            AND (1 - (mi.embedding <=> v_embedding)) >= 0.7  -- Similarity threshold
        ORDER BY mi.embedding <=> v_embedding
        LIMIT 100  -- Get top 100 items first
    ),
    place_matches AS (
        -- Aggregate items by place
        SELECT
            p.id,
            p.name,
            p.address,
            p.veggie_score,
            p.location,
            AVG(im.similarity) AS avg_similarity,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'name', im.item_name,
                    'description', im.item_description,
                    'price', im.price,
                    'currency', im.currency,
                    'similarity', im.similarity,
                    'dietaryLabels', im.dietary_labels
                )
                ORDER BY im.similarity DESC
            ) FILTER (WHERE im.similarity >= 0.7) AS items
        FROM places p
        JOIN item_matches im ON im.place_id = p.id
        WHERE p.veggie_score >= min_veggie_score
        GROUP BY p.id, p.name, p.address, p.veggie_score, p.location
        HAVING COUNT(*) >= 1  -- At least 1 matching item
    )
    SELECT
        pm.id AS place_id,
        pm.name AS place_name,
        pm.address AS place_address,
        pm.veggie_score,
        CASE
            WHEN v_user_location IS NOT NULL THEN
                ST_Distance(pm.location, v_user_location)
            ELSE NULL
        END AS distance,
        pm.avg_similarity AS match_score,
        pm.items AS matched_items
    FROM place_matches pm
    WHERE
        v_user_location IS NULL OR
        ST_DWithin(pm.location, v_user_location, max_distance)
    ORDER BY
        pm.avg_similarity DESC,
        CASE
            WHEN v_user_location IS NOT NULL THEN
                ST_Distance(pm.location, v_user_location)
            ELSE 999999
        END ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_by_craving IS 'Search restaurants by craving description using semantic search';

-- Cache table for popular searches
CREATE TABLE IF NOT EXISTS craving_search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    craving_text TEXT NOT NULL,
    craving_hash TEXT NOT NULL UNIQUE,  -- Hash of normalized craving text
    embedding VECTOR(1536) NOT NULL,
    results JSONB NOT NULL,
    search_count INT NOT NULL DEFAULT 1,
    last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_craving_search_cache_hash
ON craving_search_cache(craving_hash);

CREATE INDEX IF NOT EXISTS idx_craving_search_cache_popular
ON craving_search_cache(search_count DESC, last_searched_at DESC);

-- Function to get or cache craving search
CREATE OR REPLACE FUNCTION get_cached_craving_search(
    p_craving_text TEXT,
    p_craving_hash TEXT,
    p_embedding VECTOR(1536)
)
RETURNS JSONB AS $$
DECLARE
    v_cached JSONB;
BEGIN
    -- Try to get from cache
    SELECT results INTO v_cached
    FROM craving_search_cache
    WHERE craving_hash = p_craving_hash
        AND created_at > NOW() - INTERVAL '1 hour';  -- 1 hour cache

    IF v_cached IS NOT NULL THEN
        -- Update search count
        UPDATE craving_search_cache
        SET search_count = search_count + 1,
            last_searched_at = NOW()
        WHERE craving_hash = p_craving_hash;

        RETURN v_cached;
    END IF;

    RETURN NULL;  -- Cache miss
END;
$$ LANGUAGE plpgsql;

-- Function to store craving search in cache
CREATE OR REPLACE FUNCTION cache_craving_search(
    p_craving_text TEXT,
    p_craving_hash TEXT,
    p_embedding VECTOR(1536),
    p_results JSONB
)
RETURNS void AS $$
BEGIN
    INSERT INTO craving_search_cache (
        craving_text,
        craving_hash,
        embedding,
        results
    ) VALUES (
        p_craving_text,
        p_craving_hash,
        p_embedding,
        p_results
    )
    ON CONFLICT (craving_hash) DO UPDATE
    SET results = p_results,
        search_count = craving_search_cache.search_count + 1,
        last_searched_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cache_craving_search IS 'Cache craving search results for better performance';

-- Analytics table for search queries
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    query_type TEXT NOT NULL CHECK (query_type IN ('craving', 'keyword', 'nearby')),
    query_text TEXT NOT NULL,
    results_count INT NOT NULL,
    clicked_place_id UUID REFERENCES places(id),
    search_duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user
ON search_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query
ON search_analytics(query_type, created_at DESC);

COMMENT ON TABLE search_analytics IS 'Track search queries for analytics and improvements';
