// Edge Function: award-points
// Award points to a user for various actions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POINT_VALUES = {
  discover_place: 100,
  upload_menu_photo: 50,
  verified_review: 75,
  correct_parsing: 25,
  share_place: 20,
  daily_login: 10,
  friend_referral: 500,
  quest_completion: 0, // Set by quest reward
};

const RATE_LIMITS = {
  discover_place: { max: 50, window: 3600000 }, // 1 hour
  upload_menu: { max: 20, window: 3600000 },
  verified_review: { max: 10, window: 86400000 }, // 1 day
  daily_login: { max: 1, window: 86400000 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    const { action, related_type, related_id, metadata = {} } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limits
    const rateLimit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (rateLimit) {
      const windowStart = new Date(Date.now() - rateLimit.window);
      const { count } = await supabaseClient
        .from('points_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reason', action)
        .gte('created_at', windowStart.toISOString());

      if ((count || 0) >= rateLimit.max) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', retry_after: rateLimit.window }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get points for this action
    const points = metadata.points || POINT_VALUES[action as keyof typeof POINT_VALUES] || 0;

    if (points === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid action or no points defined' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award points using stored function
    const { data: transactionId, error: awardError } = await supabaseClient.rpc('award_points', {
      p_user_id: user.id,
      p_points: points,
      p_reason: action,
      p_related_type: related_type,
      p_related_id: related_id,
      p_metadata: metadata,
    });

    if (awardError) {
      throw new Error(`Failed to award points: ${awardError.message}`);
    }

    // Get updated user level
    const { data: userLevel } = await supabaseClient
      .from('user_levels')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Check for badge unlocks
    const badges = await checkBadgeUnlocks(supabaseClient, user.id, action, metadata);

    // Update quest progress
    await updateQuestProgress(supabaseClient, user.id, action);

    return new Response(
      JSON.stringify({
        success: true,
        points_awarded: points,
        total_points: userLevel?.total_points || points,
        level: userLevel?.level || 'bronze',
        new_badges: badges,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in award-points:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkBadgeUnlocks(supabaseClient: any, userId: string, action: string, metadata: any) {
  const newBadges = [];

  // Get user stats
  const { data: stats } = await supabaseClient
    .from('points_transactions')
    .select('reason')
    .eq('user_id', userId);

  const placesDiscovered = stats?.filter((s: any) => s.reason === 'discover_place').length || 0;
  const menusUploaded = stats?.filter((s: any) => s.reason === 'upload_menu_photo').length || 0;

  // Check for badge unlocks
  const badgeChecks = [
    { type: 'first_discover', condition: placesDiscovered === 1 },
    { type: 'explorer', tier: 'bronze', condition: placesDiscovered >= 10 },
    { type: 'explorer', tier: 'silver', condition: placesDiscovered >= 50 },
    { type: 'explorer', tier: 'gold', condition: placesDiscovered >= 200 },
    { type: 'menu_maven', tier: 'bronze', condition: menusUploaded >= 5 },
    { type: 'menu_maven', tier: 'silver', condition: menusUploaded >= 25 },
    { type: 'menu_maven', tier: 'gold', condition: menusUploaded >= 100 },
  ];

  for (const badge of badgeChecks) {
    if (badge.condition) {
      // Check if user already has this badge
      const { data: existing } = await supabaseClient
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_type', badge.type)
        .eq('badge_tier', badge.tier || null)
        .maybeSingle();

      if (!existing) {
        // Award badge
        const { data: newBadge } = await supabaseClient
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_type: badge.type,
            badge_tier: badge.tier || null,
          })
          .select()
          .single();

        if (newBadge) {
          newBadges.push(newBadge);
        }
      }
    }
  }

  return newBadges;
}

async function updateQuestProgress(supabaseClient: any, userId: string, action: string) {
  // Get active quests for this user
  const { data: userQuests } = await supabaseClient
    .from('user_quests')
    .select('*, quests(*)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!userQuests || userQuests.length === 0) return;

  for (const userQuest of userQuests) {
    const quest = userQuest.quests;
    const rules = quest.rules;

    // Check if this action matches the quest
    if (rules.action === action) {
      const progress = userQuest.progress || {};
      const currentCount = progress.count || 0;
      const newCount = currentCount + 1;

      // Update progress
      const { error } = await supabaseClient
        .from('user_quests')
        .update({
          progress: { count: newCount, target: rules.count },
          completed_at: newCount >= rules.count ? new Date().toISOString() : null,
          status: newCount >= rules.count ? 'completed' : 'active',
        })
        .eq('id', userQuest.id);

      // If quest completed, award bonus points
      if (newCount >= rules.count) {
        await supabaseClient.rpc('award_points', {
          p_user_id: userId,
          p_points: quest.reward_points,
          p_reason: 'quest_completion',
          p_related_type: 'quest',
          p_related_id: quest.id,
        });
      }
    }
  }
}
