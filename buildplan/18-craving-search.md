# Task 18: Craving Search (MunchMatcher)

## Phase
Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

## Objective
Implement semantic search that matches user cravings to menu items using embeddings.

## Description
Build the MunchMatcher feature that allows users to search by describing what they're craving (e.g., "spicy comfort food") and get relevant restaurant matches based on menu item similarity.

## Core Features

### 1. Craving to Embedding
- Convert user's craving text to embedding
- Use same model as menu items
- Handle natural language queries

### 2. Similarity Search
- Vector similarity search in pgvector
- Cosine similarity ranking
- Geographic filtering
- Dietary preference filtering

### 3. Result Aggregation
- Group items by restaurant
- Calculate match scores
- Rank restaurants
- Show top matching items

### 4. Smart Filters
- Distance from user
- VeggieScore threshold
- Dietary restrictions
- Price level
- Cuisine type

## Tasks
1. Create Edge Function: `search_by_craving`
2. Implement craving embedding generation
3. Build vector similarity search query
4. Create result aggregation logic
5. Implement geographic filtering
6. Add dietary preference filters
7. Build match score calculation
8. Optimize query performance
9. Add result caching
10. Create search analytics
11. Build search UI in mobile app
12. Test with diverse queries

## Implementation Details

```sql
CREATE OR REPLACE FUNCTION search_by_craving(
  craving_text TEXT,
  user_location GEOGRAPHY,
  max_distance FLOAT DEFAULT 5000,
  dietary_filters TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  place_id UUID,
  place_name TEXT,
  match_score FLOAT,
  matched_items JSONB,
  distance FLOAT
) AS $$
BEGIN
  -- 1. Generate embedding for craving (via Edge Function)
  -- 2. Vector similarity search on menu_items
  -- 3. Filter by distance and dietary preferences
  -- 4. Group by place and calculate scores
  -- 5. Return top 20 matches

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    AVG(1 - (mi.embedding <=> craving_embedding)) AS match_score,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'name', mi.name,
        'description', mi.description,
        'price', mi.price,
        'score', 1 - (mi.embedding <=> craving_embedding)
      )
    ) AS matched_items,
    ST_Distance(p.location, user_location) AS distance
  FROM places p
  JOIN menus m ON m.place_id = p.id
  JOIN menu_items mi ON mi.menu_id = m.id
  WHERE ST_DWithin(p.location, user_location, max_distance)
    AND (dietary_filters IS NULL OR mi.dietary_labels && dietary_filters)
  GROUP BY p.id, p.name, p.location
  HAVING AVG(1 - (mi.embedding <=> craving_embedding)) > 0.7
  ORDER BY match_score DESC, distance ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

## Search Examples
- "Creamy pasta comfort food"
- "Light and fresh salad"
- "Spicy Asian noodles"
- "Rich chocolate dessert"
- "Crispy fried appetizer"

## Success Criteria
- [ ] Edge Function deployed
- [ ] Craving embedding working
- [ ] Similarity search functional
- [ ] Geographic filtering working
- [ ] Dietary filters applied
- [ ] Results properly aggregated
- [ ] Match scores accurate
- [ ] Query performance <500ms
- [ ] Caching implemented
- [ ] UI integrated
- [ ] Tested with 50+ queries
- [ ] User feedback positive

## Dependencies
- Task 17: Embeddings Pipeline
- Task 04: Basic Edge Functions
- Task 14: Mobile App

## Estimated Time
6-7 days

## Notes
- Balance relevance vs distance
- Consider popularity boost
- Track search queries for analytics
- Implement search suggestions
- Add "I'm feeling lucky" option
- Monitor search success rate
