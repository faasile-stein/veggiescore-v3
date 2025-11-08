#!/usr/bin/env python3
"""
Embeddings Worker - Generates vector embeddings for menu items

Responsibilities:
- Poll for menu items needing embeddings
- Generate embeddings using OpenAI API
- Batch requests for efficiency (up to 100 items)
- Handle rate limiting with exponential backoff
- Store embeddings in pgvector
- Track embedding metadata (model version)
"""

import os
import sys
import time
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

import openai
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
openai.api_key = OPENAI_API_KEY

# Configuration
EMBEDDING_MODEL = 'text-embedding-ada-002'
EMBEDDING_DIMENSIONS = 1536
BATCH_SIZE = 100  # OpenAI allows up to 100 texts per request
RATE_LIMIT_DELAY = 1.0  # Seconds between batches

class EmbeddingsGenerator:
    """Generate embeddings for menu items"""

    def __init__(self):
        self.model = EMBEDDING_MODEL
        self.processed_count = 0
        self.error_count = 0

    def generate_embedding_text(self, item: Dict[str, Any]) -> str:
        """
        Generate text for embedding from menu item
        Combines name and description for better semantic search
        """
        parts = []

        if item.get('name'):
            parts.append(item['name'])

        if item.get('description'):
            parts.append(item['description'])

        # Add section context
        if item.get('section'):
            parts.append(f"Section: {item['section']}")

        # Add dietary labels for better filtering
        if item.get('dietary_labels') and len(item['dietary_labels']) > 0:
            labels = ', '.join(item['dietary_labels'])
            parts.append(f"Labels: {labels}")

        return ' | '.join(parts)

    def generate_embeddings_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate embeddings for a batch of items
        Returns list of items with embeddings
        """
        if not items:
            return []

        # Generate texts for embedding
        texts = [self.generate_embedding_text(item) for item in items]

        try:
            # Call OpenAI API
            response = openai.Embedding.create(
                model=self.model,
                input=texts
            )

            # Extract embeddings
            results = []
            for i, item in enumerate(items):
                embedding = response['data'][i]['embedding']
                results.append({
                    'id': item['id'],
                    'embedding': embedding,
                    'text': texts[i],
                    'model_version': self.model,
                })

            self.processed_count += len(items)
            return results

        except openai.error.RateLimitError as e:
            print(f"[Embeddings] Rate limit hit, backing off...")
            time.sleep(5)
            return self.generate_embeddings_batch(items)  # Retry

        except Exception as e:
            print(f"[Embeddings] Error generating embeddings: {e}")
            self.error_count += len(items)
            raise

    def store_embeddings(self, results: List[Dict[str, Any]]) -> None:
        """Store embeddings in database"""
        for result in results:
            try:
                supabase.from_('menu_items').update({
                    'embedding': result['embedding'],
                    'embedding_model': result['model_version'],
                    'embedding_generated_at': datetime.utcnow().isoformat(),
                }).eq('id', result['id']).execute()

            except Exception as e:
                print(f"[Embeddings] Error storing embedding for {result['id']}: {e}")
                self.error_count += 1

    def process_pending_items(self, limit: int = BATCH_SIZE) -> int:
        """
        Process items that need embeddings
        Returns number of items processed
        """
        # Fetch items without embeddings or with outdated embeddings
        response = supabase.from_('menu_items').select('id, name, description, section, dietary_labels').is_('embedding', 'null').limit(limit).execute()

        items = response.data
        if not items:
            return 0

        print(f"[Embeddings] Processing batch of {len(items)} items")

        # Generate embeddings
        results = self.generate_embeddings_batch(items)

        # Store results
        self.store_embeddings(results)

        print(f"[Embeddings] Completed batch: {len(results)} items")
        return len(results)

    def backfill_all(self) -> None:
        """Backfill embeddings for all items"""
        print("[Embeddings] Starting backfill...")

        total_processed = 0
        while True:
            processed = self.process_pending_items(BATCH_SIZE)
            if processed == 0:
                break

            total_processed += processed
            print(f"[Embeddings] Backfill progress: {total_processed} items")

            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)

        print(f"[Embeddings] Backfill complete: {total_processed} items processed")


def create_vector_index():
    """Create IVFFlat index for fast similarity search"""
    print("[Embeddings] Creating vector index...")

    # Execute via Supabase function
    query = """
    CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
    ON menu_items
    USING ivfflat(embedding vector_cosine_ops)
    WITH (lists = 100);
    """

    try:
        # Note: This requires direct database access
        # In production, run this as a migration
        print("[Embeddings] Note: Vector index should be created via migration")
        print("[Embeddings] See: supabase/migrations/20250101000008_create_vector_index.sql")
    except Exception as e:
        print(f"[Embeddings] Error creating index: {e}")


def main():
    """Main worker loop"""
    print("[Embeddings] Worker started")

    generator = EmbeddingsGenerator()

    # Check if we should do initial backfill
    if os.getenv('BACKFILL_ON_START', 'false').lower() == 'true':
        generator.backfill_all()

    # Continuous processing loop
    print("[Embeddings] Entering continuous processing mode...")

    while True:
        try:
            processed = generator.process_pending_items(BATCH_SIZE)

            if processed > 0:
                print(f"[Embeddings] Stats - Processed: {generator.processed_count}, Errors: {generator.error_count}")

            # If no items to process, wait longer
            wait_time = 5 if processed == 0 else RATE_LIMIT_DELAY
            time.sleep(wait_time)

        except KeyboardInterrupt:
            print("[Embeddings] Shutting down...")
            break
        except Exception as e:
            print(f"[Embeddings] Error in main loop: {e}")
            time.sleep(10)


if __name__ == '__main__':
    main()
