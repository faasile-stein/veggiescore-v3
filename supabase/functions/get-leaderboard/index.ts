// Edge Function: get-leaderboard
// Get leaderboard with various scopes and timeframes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'global';
    const timeframe = url.searchParams.get('timeframe') || 'all_time';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Check cache first
    const { data: cached } = await supabaseClient
      .from('leaderboard_cache')
      .select('payload, updated_at')
      .eq('scope', scope)
      .eq('timeframe', timeframe)
      .maybeSingle();

    // If cache is fresh (< 5 minutes old), use it
    if (cached && new Date(cached.updated_at).getTime() > Date.now() - 300000) {
      return new Response(
        JSON.stringify({
          leaderboard: cached.payload.slice(0, limit),
          cached: true,
          updated_at: cached.updated_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate fresh leaderboard
    const { data: leaderboard, error } = await supabaseClient.rpc('get_leaderboard', {
      p_scope: scope,
      p_timeframe: timeframe,
      p_limit: limit,
    });

    if (error) {
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }

    // Update cache
    await supabaseClient
      .from('leaderboard_cache')
      .upsert({
        scope,
        timeframe,
        payload: leaderboard,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'scope,timeframe',
      });

    // Get user profiles for leaderboard
    const userIds = leaderboard.map((entry: any) => entry.user_id);
    const { data: profiles } = await supabaseClient.auth.admin.listUsers();

    const enrichedLeaderboard = leaderboard.map((entry: any) => {
      const profile = profiles?.users.find(u => u.id === entry.user_id);
      return {
        ...entry,
        username: profile?.email?.split('@')[0] || 'Anonymous',
        avatar_url: profile?.user_metadata?.avatar_url || null,
      };
    });

    return new Response(
      JSON.stringify({
        leaderboard: enrichedLeaderboard,
        cached: false,
        updated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-leaderboard:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
