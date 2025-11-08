// Edge Function: get-user-stats
// Get comprehensive user statistics including points, level, badges, quests

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user level
    const { data: userLevel } = await supabaseClient
      .from('user_levels')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get badges
    const { data: badges } = await supabaseClient
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false });

    // Get active quests
    const { data: quests } = await supabaseClient
      .from('user_quests')
      .select('*, quests(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'completed'])
      .order('started_at', { ascending: false });

    // Get recent activity
    const { data: recentActivity } = await supabaseClient
      .from('points_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate stats
    const totalPointsEarned = recentActivity?.reduce((sum, t) => sum + t.points, 0) || 0;
    const placesDiscovered = recentActivity?.filter(t => t.reason === 'discover_place').length || 0;
    const menusUploaded = recentActivity?.filter(t => t.reason === 'upload_menu_photo').length || 0;

    // Get leaderboard rank
    const { data: leaderboard } = await supabaseClient.rpc('get_leaderboard', {
      p_scope: 'global',
      p_timeframe: 'all_time',
      p_limit: 1000,
    });

    const userRank = leaderboard?.findIndex((entry: any) => entry.user_id === user.id) + 1 || null;

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
        },
        level: {
          level: userLevel?.level || 'bronze',
          total_points: userLevel?.total_points || 0,
          level_achieved_at: userLevel?.level_achieved_at,
        },
        badges: badges || [],
        quests: quests || [],
        stats: {
          total_points_earned: totalPointsEarned,
          places_discovered: placesDiscovered,
          menus_uploaded: menusUploaded,
          badges_unlocked: badges?.length || 0,
          quests_completed: quests?.filter(q => q.status === 'completed').length || 0,
          global_rank: userRank,
        },
        recent_activity: recentActivity || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-user-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
