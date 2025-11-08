-- Create Vector Index for Embeddings
-- Phase 4: Embeddings Pipeline

-- Add embedding metadata columns if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='menu_items' AND column_name='embedding_model') THEN
        ALTER TABLE menu_items ADD COLUMN embedding_model TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='menu_items' AND column_name='embedding_generated_at') THEN
        ALTER TABLE menu_items ADD COLUMN embedding_generated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create IVFFlat index for fast similarity search
-- Using cosine distance for semantic similarity
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items
USING ivfflat(embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search menu items by embedding similarity
CREATE OR REPLACE FUNCTION search_menu_items_by_embedding(
    query_embedding VECTOR(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 20,
    dietary_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    item_id UUID,
    item_name TEXT,
    description TEXT,
    price DECIMAL,
    similarity FLOAT,
    place_name TEXT,
    dietary_labels TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mi.id AS item_id,
        mi.name AS item_name,
        mi.description,
        mi.price,
        1 - (mi.embedding <=> query_embedding) AS similarity,
        p.name AS place_name,
        mi.dietary_labels
    FROM menu_items mi
    JOIN menus m ON m.id = mi.menu_id
    JOIN places p ON p.id = m.place_id
    WHERE mi.embedding IS NOT NULL
        AND (dietary_filter IS NULL OR mi.dietary_labels && dietary_filter)
        AND (1 - (mi.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY mi.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_menu_items_by_embedding IS 'Search menu items by embedding similarity using cosine distance';

-- Function to find similar items to a given item
CREATE OR REPLACE FUNCTION find_similar_items(
    item_id UUID,
    max_results INT DEFAULT 10
)
RETURNS TABLE (
    similar_item_id UUID,
    similar_item_name TEXT,
    description TEXT,
    similarity FLOAT,
    place_name TEXT
) AS $$
DECLARE
    query_embedding VECTOR(1536);
BEGIN
    -- Get embedding of the query item
    SELECT embedding INTO query_embedding
    FROM menu_items
    WHERE id = item_id;

    IF query_embedding IS NULL THEN
        RAISE EXCEPTION 'Item % has no embedding', item_id;
    END IF;

    RETURN QUERY
    SELECT
        mi.id AS similar_item_id,
        mi.name AS similar_item_name,
        mi.description,
        1 - (mi.embedding <=> query_embedding) AS similarity,
        p.name AS place_name
    FROM menu_items mi
    JOIN menus m ON m.id = mi.menu_id
    JOIN places p ON p.id = m.place_id
    WHERE mi.id != item_id
        AND mi.embedding IS NOT NULL
    ORDER BY mi.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_similar_items IS 'Find similar menu items based on embedding similarity';

-- Track embedding statistics
CREATE TABLE IF NOT EXISTS embedding_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_items INT NOT NULL,
    items_with_embeddings INT NOT NULL,
    embedding_model TEXT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avg_cost_per_item DECIMAL(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update embedding statistics
CREATE OR REPLACE FUNCTION update_embedding_stats()
RETURNS void AS $$
DECLARE
    v_total INT;
    v_with_embeddings INT;
    v_model TEXT;
BEGIN
    SELECT COUNT(*),
           COUNT(embedding),
           MODE() WITHIN GROUP (ORDER BY embedding_model)
    INTO v_total, v_with_embeddings, v_model
    FROM menu_items;

    INSERT INTO embedding_stats (
        total_items,
        items_with_embeddings,
        embedding_model,
        last_updated,
        avg_cost_per_item
    ) VALUES (
        v_total,
        v_with_embeddings,
        COALESCE(v_model, 'text-embedding-ada-002'),
        NOW(),
        0.0001  -- $0.0001 per 1K tokens (ada-002 pricing)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_embedding_stats IS 'Update embedding generation statistics';

-- Trigger to update stats periodically (called manually or by cron)
-- In production, set up pg_cron to run this daily
