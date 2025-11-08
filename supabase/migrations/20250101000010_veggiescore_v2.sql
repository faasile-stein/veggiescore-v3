-- VeggieScore v2 Algorithm
-- Phase 4: Enhanced scoring with variety, quality, and section balance

-- Add score breakdown columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='places' AND column_name='score_breakdown') THEN
        ALTER TABLE places ADD COLUMN score_breakdown JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='places' AND column_name='score_version') THEN
        ALTER TABLE places ADD COLUMN score_version TEXT DEFAULT 'v2';
    END IF;
END $$;

-- VeggieScore v2 Calculation Function
CREATE OR REPLACE FUNCTION calculate_veggie_score_v2(p_place_id UUID)
RETURNS TABLE (
    score INT,
    breakdown JSONB
) AS $$
DECLARE
    v_total_items INT;
    v_vegan_items INT;
    v_vegetarian_items INT;
    v_base_score FLOAT;
    v_variety_score FLOAT;
    v_label_quality_score FLOAT;
    v_section_balance_score FLOAT;
    v_final_score INT;
    v_breakdown JSONB;
    v_sections JSONB;
    v_unique_ingredients INT;
    v_items_with_labels INT;
    v_items_with_ingredients INT;
BEGIN
    -- Get menu item statistics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE 'vegan' = ANY(dietary_labels)),
        COUNT(*) FILTER (WHERE 'vegetarian' = ANY(dietary_labels)),
        COUNT(DISTINCT section),
        COUNT(DISTINCT ingredient) FILTER (WHERE ingredient IS NOT NULL),
        COUNT(*) FILTER (WHERE COALESCE(array_length(dietary_labels, 1), 0) > 0),
        COUNT(*) FILTER (WHERE COALESCE(array_length(ingredients, 1), 0) > 0)
    INTO
        v_total_items,
        v_vegan_items,
        v_vegetarian_items,
        v_unique_ingredients,
        v_items_with_labels,
        v_items_with_ingredients
    FROM menu_items mi
    JOIN menus m ON m.id = mi.menu_id
    LEFT JOIN LATERAL unnest(mi.ingredients) AS ingredient ON true
    WHERE m.place_id = p_place_id;

    -- Default to 0 if no items
    IF v_total_items = 0 THEN
        RETURN QUERY SELECT 0, '{}'::JSONB;
        RETURN;
    END IF;

    -- 1. Base Score (70% weight)
    -- % vegan items * 100 + % vegetarian items * 50
    v_base_score := (
        (v_vegan_items::FLOAT / v_total_items * 100) +
        (v_vegetarian_items::FLOAT / v_total_items * 50)
    );

    -- 2. Variety Bonus (15% weight)
    -- Based on number of unique sections and ingredients
    WITH section_counts AS (
        SELECT
            COUNT(DISTINCT section) AS section_count,
            JSONB_OBJECT_AGG(
                section,
                JSONB_BUILD_OBJECT(
                    'total', COUNT(*),
                    'vegan', COUNT(*) FILTER (WHERE 'vegan' = ANY(dietary_labels))
                )
            ) AS section_distribution
        FROM menu_items mi
        JOIN menus m ON m.id = mi.menu_id
        WHERE m.place_id = p_place_id
            AND section IS NOT NULL
    )
    SELECT
        LEAST(1.0,
            (section_count::FLOAT / 5.0) * 0.5 +  -- Max 5 sections
            (v_unique_ingredients::FLOAT / 20.0) * 0.5  -- Max 20 unique ingredients
        ) * 10.0,
        section_distribution
    INTO v_variety_score, v_sections
    FROM section_counts;

    v_variety_score := COALESCE(v_variety_score, 0);
    v_sections := COALESCE(v_sections, '{}'::JSONB);

    -- 3. Label Quality Score (10% weight)
    -- Items with clear labels and ingredient lists
    v_label_quality_score := (
        (v_items_with_labels::FLOAT / v_total_items) * 0.6 +
        (v_items_with_ingredients::FLOAT / v_total_items) * 0.4
    ) * 5.0;

    -- 4. Section Balance Score (5% weight)
    -- Bonus if vegan options span multiple sections
    WITH section_balance AS (
        SELECT
            COUNT(DISTINCT section) FILTER (WHERE 'vegan' = ANY(dietary_labels)) AS vegan_sections,
            BOOL_OR(section = 'appetizers' AND 'vegan' = ANY(dietary_labels)) AS has_vegan_appetizers,
            BOOL_OR(section = 'mains' AND 'vegan' = ANY(dietary_labels)) AS has_vegan_mains,
            BOOL_OR(section = 'desserts' AND 'vegan' = ANY(dietary_labels)) AS has_vegan_desserts
        FROM menu_items mi
        JOIN menus m ON m.id = mi.menu_id
        WHERE m.place_id = p_place_id
    )
    SELECT
        (
            (has_vegan_appetizers::INT +
             has_vegan_mains::INT +
             has_vegan_desserts::INT)::FLOAT / 3.0
        ) * 5.0
    INTO v_section_balance_score
    FROM section_balance;

    v_section_balance_score := COALESCE(v_section_balance_score, 0);

    -- Calculate final weighted score (capped at 100)
    v_final_score := LEAST(100, ROUND(
        v_base_score * 0.7 +
        v_variety_score * 0.15 +
        v_label_quality_score * 0.1 +
        v_section_balance_score * 0.05
    )::INT);

    -- Build breakdown JSON
    v_breakdown := JSONB_BUILD_OBJECT(
        'version', 'v2',
        'total_items', v_total_items,
        'vegan_items', v_vegan_items,
        'vegetarian_items', v_vegetarian_items,
        'base_score', ROUND(v_base_score, 2),
        'variety_score', ROUND(v_variety_score, 2),
        'label_quality_score', ROUND(v_label_quality_score, 2),
        'section_balance_score', ROUND(v_section_balance_score, 2),
        'final_score', v_final_score,
        'weights', JSONB_BUILD_OBJECT(
            'base', 0.7,
            'variety', 0.15,
            'label_quality', 0.1,
            'section_balance', 0.05
        ),
        'sections', v_sections,
        'stats', JSONB_BUILD_OBJECT(
            'unique_ingredients', v_unique_ingredients,
            'items_with_labels', v_items_with_labels,
            'items_with_ingredients', v_items_with_ingredients
        )
    );

    RETURN QUERY SELECT v_final_score, v_breakdown;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_veggie_score_v2 IS 'Calculate VeggieScore v2 with variety, quality, and balance components';

-- Function to update all place scores
CREATE OR REPLACE FUNCTION update_all_veggie_scores()
RETURNS TABLE (
    place_id UUID,
    old_score INT,
    new_score INT,
    score_change INT
) AS $$
BEGIN
    RETURN QUERY
    WITH score_updates AS (
        SELECT
            p.id,
            p.veggie_score AS old_score,
            s.score AS new_score,
            s.breakdown
        FROM places p
        CROSS JOIN LATERAL calculate_veggie_score_v2(p.id) s
    )
    UPDATE places p
    SET
        veggie_score = su.new_score,
        score_breakdown = su.breakdown,
        score_version = 'v2',
        updated_at = NOW()
    FROM score_updates su
    WHERE p.id = su.id
    RETURNING p.id, su.old_score, su.new_score, (su.new_score - su.old_score) AS score_change;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_all_veggie_scores IS 'Recalculate and update VeggieScore for all places';

-- Trigger to auto-update VeggieScore when menu items change
CREATE OR REPLACE FUNCTION trigger_update_veggie_score()
RETURNS TRIGGER AS $$
DECLARE
    v_place_id UUID;
BEGIN
    -- Get place_id from menu
    SELECT m.place_id INTO v_place_id
    FROM menus m
    WHERE m.id = COALESCE(NEW.menu_id, OLD.menu_id);

    -- Recalculate score
    WITH new_score AS (
        SELECT score, breakdown
        FROM calculate_veggie_score_v2(v_place_id)
    )
    UPDATE places
    SET
        veggie_score = new_score.score,
        score_breakdown = new_score.breakdown,
        score_version = 'v2',
        updated_at = NOW()
    FROM new_score
    WHERE id = v_place_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on menu_items
DROP TRIGGER IF EXISTS trigger_menu_item_veggie_score ON menu_items;
CREATE TRIGGER trigger_menu_item_veggie_score
AFTER INSERT OR UPDATE OR DELETE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_veggie_score();

COMMENT ON TRIGGER trigger_menu_item_veggie_score ON menu_items IS 'Auto-update VeggieScore when menu items change';

-- Score tier view for easier querying
CREATE OR REPLACE VIEW veggie_score_tiers AS
SELECT
    id,
    name,
    veggie_score,
    CASE
        WHEN veggie_score >= 90 THEN 'outstanding'
        WHEN veggie_score >= 70 THEN 'great'
        WHEN veggie_score >= 50 THEN 'good'
        WHEN veggie_score >= 30 THEN 'some'
        ELSE 'limited'
    END AS tier,
    CASE
        WHEN veggie_score >= 90 THEN 'Outstanding vegan options'
        WHEN veggie_score >= 70 THEN 'Great vegan choices'
        WHEN veggie_score >= 50 THEN 'Good vegetarian options'
        WHEN veggie_score >= 30 THEN 'Some plant-based items'
        ELSE 'Limited options'
    END AS tier_description,
    score_breakdown
FROM places;

COMMENT ON VIEW veggie_score_tiers IS 'Places categorized by VeggieScore tier';
