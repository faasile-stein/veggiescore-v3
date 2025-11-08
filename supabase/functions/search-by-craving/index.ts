/**
 * Search by Craving Edge Function (MunchMatcher)
 *
 * Allows users to search for restaurants by describing what they're craving
 * using semantic search with embeddings.
 *
 * Examples:
 * - "creamy pasta comfort food"
 * - "spicy Asian noodles"
 * - "light fresh salad"
 * - "rich chocolate dessert"
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface SearchRequest {
  craving: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;  // in meters
  dietaryFilters?: string[];
  minVeggieScore?: number;
  limit?: number;
}

interface SearchResult {
  place: {
    id: string;
    name: string;
    address: string;
    veggieScore: number;
    distance?: number;
  };
  matchScore: number;
  matchedItems: Array<{
    name: string;
    description: string;
    price: number;
    currency: string;
    similarity: number;
    dietaryLabels: string[];
  }>;
}

/**
 * Generate embedding for craving text
 */
async function generateCravingEmbedding(craving: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: craving,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search restaurants by craving
 */
async function searchByCreaving(request: SearchRequest): Promise<SearchResult[]> {
  // 1. Generate embedding for craving
  const cravingEmbedding = await generateCravingEmbedding(request.craving);

  // 2. Build query
  let query = supabase.rpc('search_by_craving', {
    craving_embedding: JSON.stringify(cravingEmbedding),
    user_latitude: request.latitude,
    user_longitude: request.longitude,
    max_distance: request.maxDistance || 5000,  // Default 5km
    dietary_filters: request.dietaryFilters || null,
    min_veggie_score: request.minVeggieScore || 0,
    result_limit: request.limit || 20,
  });

  const { data, error } = await query;

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  return data || [];
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const request: SearchRequest = await req.json();

    // Validate request
    if (!request.craving || request.craving.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Craving text is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Perform search
    const results = await searchByCreaving(request);

    return new Response(
      JSON.stringify({
        query: request.craving,
        results,
        count: results.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
