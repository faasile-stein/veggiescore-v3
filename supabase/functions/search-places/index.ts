// Edge Function: search-places
// Search for places with filters (basic version - to be enhanced in Phase 4)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query?: string;
  location?: {
    lat: number;
    lng: number;
  };
  max_distance?: number; // meters
  min_veggie_score?: number;
  cuisine_types?: string[];
  price_level?: number;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Parse request (GET or POST)
    let params: SearchRequest;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      params = {
        query: url.searchParams.get('query') || undefined,
        min_veggie_score: url.searchParams.get('min_veggie_score')
          ? parseInt(url.searchParams.get('min_veggie_score')!)
          : undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20,
        offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0,
      };
    } else {
      params = await req.json();
    }

    // Build query
    let query = supabaseClient
      .from('places')
      .select('id, google_place_id, name, address, website, cuisine_types, price_level, rating, veggie_score, created_at');

    // Apply filters
    if (params.query) {
      query = query.ilike('name', `%${params.query}%`);
    }

    if (params.min_veggie_score !== undefined) {
      query = query.gte('veggie_score', params.min_veggie_score);
    }

    if (params.cuisine_types && params.cuisine_types.length > 0) {
      query = query.overlaps('cuisine_types', params.cuisine_types);
    }

    if (params.price_level !== undefined) {
      query = query.eq('price_level', params.price_level);
    }

    // Location-based filtering (basic version)
    // Note: This is a simple implementation. For production, use PostGIS ST_DWithin
    // which will be implemented in Phase 4

    // Pagination
    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    query = query
      .order('veggie_score', { ascending: false, nullsFirst: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Execute query
    const { data: places, error, count } = await query;

    if (error) {
      console.error('Error searching places:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search places', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate distance if location provided (simplified version)
    // In Phase 4, this will use PostGIS for accurate distance calculation
    let results = places || [];
    if (params.location && results.length > 0) {
      // For now, just return results without distance calculation
      // Will be enhanced in Phase 4 with proper geospatial queries
    }

    return new Response(
      JSON.stringify({
        results: results,
        total: count,
        limit: limit,
        offset: offset,
        has_more: (count || 0) > offset + limit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-places:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
