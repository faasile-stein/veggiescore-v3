-- A/B Testing Framework
-- Phase 5: Experimentation Infrastructure

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    target_sample_size INT,
    metrics JSONB NOT NULL DEFAULT '[]'::JSONB,  -- Array of metric names to track
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_dates ON experiments(start_date, end_date);

COMMENT ON TABLE experiments IS 'A/B testing experiments configuration';

-- Experiment variants
CREATE TABLE IF NOT EXISTS experiment_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- 'control', 'treatment_a', etc.
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,  -- Variant-specific configuration
    allocation_percent INT NOT NULL CHECK (allocation_percent BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(experiment_id, name)
);

CREATE INDEX idx_experiment_variants_experiment ON experiment_variants(experiment_id);

COMMENT ON TABLE experiment_variants IS 'Variants for each experiment';

-- User assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(experiment_id, user_id)  -- One variant per user per experiment
);

CREATE INDEX idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_experiment_assignments_variant ON experiment_assignments(variant_id);

COMMENT ON TABLE experiment_assignments IS 'Track which users are assigned to which variants';

-- Experiment events
CREATE TABLE IF NOT EXISTS experiment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiment_events_experiment ON experiment_events(experiment_id, created_at DESC);
CREATE INDEX idx_experiment_events_variant ON experiment_events(variant_id, event_name);
CREATE INDEX idx_experiment_events_user ON experiment_events(user_id, created_at DESC);

COMMENT ON TABLE experiment_events IS 'Track all events for experiments';

-- Function to assign user to variant
CREATE OR REPLACE FUNCTION assign_user_to_variant(
    p_experiment_id UUID,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_variant_id UUID;
    v_user_hash INT;
    v_bucket INT;
    v_cumulative_percent INT := 0;
    v_variant RECORD;
BEGIN
    -- Check if user already assigned
    SELECT variant_id INTO v_variant_id
    FROM experiment_assignments
    WHERE experiment_id = p_experiment_id
        AND user_id = p_user_id;

    IF v_variant_id IS NOT NULL THEN
        RETURN v_variant_id;
    END IF;

    -- Calculate hash bucket (0-99)
    v_user_hash := ABS(HASHTEXT(p_user_id::TEXT || p_experiment_id::TEXT));
    v_bucket := v_user_hash % 100;

    -- Assign to variant based on allocation
    FOR v_variant IN
        SELECT id, allocation_percent
        FROM experiment_variants
        WHERE experiment_id = p_experiment_id
        ORDER BY created_at
    LOOP
        v_cumulative_percent := v_cumulative_percent + v_variant.allocation_percent;

        IF v_bucket < v_cumulative_percent THEN
            v_variant_id := v_variant.id;
            EXIT;
        END IF;
    END LOOP;

    -- Store assignment
    IF v_variant_id IS NOT NULL THEN
        INSERT INTO experiment_assignments (experiment_id, variant_id, user_id)
        VALUES (p_experiment_id, v_variant_id, p_user_id)
        ON CONFLICT (experiment_id, user_id) DO NOTHING;
    END IF;

    RETURN v_variant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_user_to_variant IS 'Consistently assign user to experiment variant using hash-based bucketing';

-- Function to track experiment event
CREATE OR REPLACE FUNCTION track_experiment_event(
    p_experiment_id UUID,
    p_user_id UUID,
    p_event_name TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_variant_id UUID;
    v_event_id UUID;
BEGIN
    -- Get user's variant assignment
    SELECT variant_id INTO v_variant_id
    FROM experiment_assignments
    WHERE experiment_id = p_experiment_id
        AND user_id = p_user_id;

    IF v_variant_id IS NULL THEN
        RAISE EXCEPTION 'User % not assigned to experiment %', p_user_id, p_experiment_id;
    END IF;

    -- Track event
    INSERT INTO experiment_events (
        experiment_id,
        variant_id,
        user_id,
        event_name,
        metadata
    ) VALUES (
        p_experiment_id,
        v_variant_id,
        p_user_id,
        p_event_name,
        p_metadata
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_experiment_event IS 'Track an event for an experiment';

-- Function to calculate experiment results
CREATE OR REPLACE FUNCTION calculate_experiment_results(
    p_experiment_id UUID,
    p_conversion_event TEXT DEFAULT NULL
)
RETURNS TABLE (
    variant_name TEXT,
    users_assigned BIGINT,
    total_events BIGINT,
    conversion_events BIGINT,
    conversion_rate FLOAT,
    avg_events_per_user FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ev.name AS variant_name,
        COUNT(DISTINCT ea.user_id) AS users_assigned,
        COUNT(ee.id) AS total_events,
        COUNT(ee.id) FILTER (WHERE p_conversion_event IS NULL OR ee.event_name = p_conversion_event) AS conversion_events,
        CASE
            WHEN COUNT(DISTINCT ea.user_id) > 0 THEN
                COUNT(ee.id) FILTER (WHERE p_conversion_event IS NULL OR ee.event_name = p_conversion_event)::FLOAT /
                COUNT(DISTINCT ea.user_id)
            ELSE 0
        END AS conversion_rate,
        CASE
            WHEN COUNT(DISTINCT ea.user_id) > 0 THEN
                COUNT(ee.id)::FLOAT / COUNT(DISTINCT ea.user_id)
            ELSE 0
        END AS avg_events_per_user
    FROM experiment_variants ev
    LEFT JOIN experiment_assignments ea ON ea.variant_id = ev.id
    LEFT JOIN experiment_events ee ON ee.variant_id = ev.id AND ee.user_id = ea.user_id
    WHERE ev.experiment_id = p_experiment_id
    GROUP BY ev.id, ev.name
    ORDER BY ev.created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_experiment_results IS 'Calculate conversion rates and metrics for experiment variants';

-- View for active experiments
CREATE OR REPLACE VIEW active_experiments AS
SELECT
    e.*,
    COUNT(DISTINCT ea.user_id) AS total_users,
    COUNT(DISTINCT ev.id) AS variant_count
FROM experiments e
LEFT JOIN experiment_assignments ea ON ea.experiment_id = e.id
LEFT JOIN experiment_variants ev ON ev.experiment_id = e.id
WHERE e.status = 'running'
    AND (e.start_date IS NULL OR e.start_date <= NOW())
    AND (e.end_date IS NULL OR e.end_date >= NOW())
GROUP BY e.id;

COMMENT ON VIEW active_experiments IS 'Currently running experiments with basic stats';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experiments_updated_at
BEFORE UPDATE ON experiments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
