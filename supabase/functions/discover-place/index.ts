// Edge Function: discover-place
// Creates a new place and enqueues a crawl job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverPlaceRequest {
  google_place_id: string;
  name: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  website?: string;
  phone?: string;
  cuisine_types?: string[];
  price_level?: number;
  rating?: number;
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const body: DiscoverPlaceRequest = await req.json();

    // Validate required fields
    if (!body.google_place_id || !body.name) {
      return new Response(
        JSON.stringify({ error: 'google_place_id and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if place already exists
    const { data: existingPlace, error: checkError } = await supabaseClient
      .from('places')
      .select('id, name, veggie_score')
      .eq('google_place_id', body.google_place_id)
      .single();

    if (existingPlace) {
      return new Response(
        JSON.stringify({
          place_id: existingPlace.id,
          name: existingPlace.name,
          veggie_score: existingPlace.veggie_score,
          already_exists: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert location to PostGIS point
    let locationWKT = null;
    if (body.location) {
      locationWKT = `POINT(${body.location.lng} ${body.location.lat})`;
    }

    // Create place
    const { data: place, error: placeError } = await supabaseClient
      .from('places')
      .insert({
        google_place_id: body.google_place_id,
        name: body.name,
        address: body.address,
        location: locationWKT,
        website: body.website,
        phone: body.phone,
        cuisine_types: body.cuisine_types,
        price_level: body.price_level,
        rating: body.rating,
      })
      .select()
      .single();

    if (placeError) {
      console.error('Error creating place:', placeError);
      return new Response(
        JSON.stringify({ error: 'Failed to create place', details: placeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enqueue crawl job if website is provided
    let crawlJobId = null;
    if (body.website) {
      const { data: job, error: jobError } = await supabaseClient
        .from('jobs')
        .insert({
          job_type: 'crawl',
          payload: {
            place_id: place.id,
            website: body.website,
          },
          priority: 10,
        })
        .select()
        .single();

      if (jobError) {
        console.error('Error creating crawl job:', jobError);
      } else {
        crawlJobId = job.id;
      }
    }

    // Award points to user if authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);

      if (user) {
        await supabaseClient
          .from('points_transactions')
          .insert({
            user_id: user.id,
            points: 100,
            reason: 'discover_place',
            related_type: 'place',
            related_id: place.id,
          });
      }
    }

    return new Response(
      JSON.stringify({
        place_id: place.id,
        name: place.name,
        crawl_job_id: crawlJobId,
        points_awarded: authHeader ? 100 : 0,
        message: crawlJobId
          ? 'Place created and crawl job enqueued'
          : 'Place created (no website to crawl)',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in discover-place:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
