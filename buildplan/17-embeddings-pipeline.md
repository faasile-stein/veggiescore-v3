# Task 17: Embeddings Pipeline

## Phase
Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

## Objective
Implement embedding generation for all menu items to enable semantic search and craving matching.

## Description
Build a pipeline to generate vector embeddings for menu items using OpenAI's text-embedding-ada-002 or similar models, store them in pgvector, and enable similarity search.

## Core Components

### 1. Embedding Generation
- Generate embeddings for item name + description
- Use OpenAI text-embedding-ada-002 (1536 dimensions)
- Batch requests for efficiency
- Handle rate limits

### 2. Storage
- Store in pgvector column
- Create IVFFlat index
- Optimize for similarity search

### 3. Updates
- Generate for new items
- Regenerate on item updates
- Track embedding version

## Tasks
1. Set up OpenAI API integration
2. Create embedding generation worker
3. Implement batching logic (up to 100 items)
4. Build rate limiting and retry logic
5. Store embeddings in pgvector
6. Create/update IVFFlat index
7. Implement backfill for existing items
8. Set up automatic generation for new items
9. Track embedding metadata (model, version)
10. Implement update triggers
11. Monitor costs
12. Test similarity search

## Implementation Details

```python
import openai

def generate_embeddings(items: list[MenuItem]):
    texts = [f"{item.name} {item.description}" for item in items]

    # Batch into chunks of 100
    batches = chunk_list(texts, 100)

    for batch in batches:
        response = openai.Embedding.create(
            model='text-embedding-ada-002',
            input=batch
        )

        for i, item in enumerate(items):
            embedding = response['data'][i]['embedding']

            # Store in pgvector
            supabase.from('menu_items').update({
                'embedding': embedding,
                'model_version': 'ada-002'
            }).eq('id', item.id).execute()
```

## Index Setup
```sql
-- Create IVFFlat index for fast similarity search
CREATE INDEX idx_menu_items_embedding
ON menu_items
USING ivfflat(embedding vector_cosine_ops)
WITH (lists = 100);
```

## Cost Optimization
- Batch requests (up to 100 items)
- Cache common embeddings
- Only regenerate on changes
- Consider local models (sentence-transformers)
- Monitor API usage

## Success Criteria
- [ ] OpenAI API integrated
- [ ] Embedding worker running
- [ ] Batching implemented
- [ ] Rate limiting working
- [ ] Embeddings stored in pgvector
- [ ] IVFFlat index created
- [ ] Backfill completed for all items
- [ ] Auto-generation for new items
- [ ] Update triggers working
- [ ] Cost per item < $0.0001
- [ ] Similarity search working (<100ms)

## Dependencies
- Task 09: Parser Service
- Task 02: Database Schema

## Estimated Time
5-6 days

## Notes
- OpenAI ada-002: $0.0001 per 1K tokens
- Alternative: sentence-transformers (free, self-hosted)
- Consider dimension reduction (1536 → 384)
- Monitor embedding quality
- Version embeddings for updates
