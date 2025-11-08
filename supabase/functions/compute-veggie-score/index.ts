/**
 * Compute VeggieScore v2 Edge Function
 *
 * Calculate or recalculate VeggieScore for a place
 * Supports both single place and batch updates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ComputeRequest {
  placeId?: string;
  updateAll?: boolean;
}

interface ScoreResult {
  placeId: string;
  oldScore: number;
  newScore: number;
  scoreChange: number;
  breakdown: any;
}

/**
 * Compute score for a single place
 */
async function computeSingleScore(placeId: string): Promise<ScoreResult> {
  // Get current score
  const { data: place } = await supabase
    .from('places')
    .select('veggie_score')
    .eq('id', placeId)
    .single();

  const oldScore = place?.veggie_score || 0;

  // Calculate new score
  const { data: scoreData, error } = await supabase
    .rpc('calculate_veggie_score_v2', { p_place_id: placeId });

  if (error) {
    throw new Error(`Failed to calculate score: ${error.message}`);
  }

  const result = scoreData[0];
  const newScore = result.score;
  const breakdown = result.breakdown;

  // Update place
  await supabase
    .from('places')
    .update({
      veggie_score: newScore,
      score_breakdown: breakdown,
      score_version: 'v2',
      updated_at: new Date().toISOString(),
    })
    .eq('id', placeId);

  return {
    placeId,
    oldScore,
    newScore,
    scoreChange: newScore - oldScore,
    breakdown,
  };
}

/**
 * Update all place scores
 */
async function updateAllScores(): Promise<ScoreResult[]> {
  const { data, error } = await supabase.rpc('update_all_veggie_scores');

  if (error) {
    throw new Error(`Failed to update all scores: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    placeId: row.place_id,
    oldScore: row.old_score,
    newScore: row.new_score,
    scoreChange: row.score_change,
    breakdown: null,  // Not included in batch update
  }));
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
    const request: ComputeRequest = await req.json();

    let results: ScoreResult[];

    if (request.updateAll) {
      // Batch update all places
      console.log('Updating all place scores...');
      results = await updateAllScores();
    } else if (request.placeId) {
      // Single place update
      console.log(`Computing score for place ${request.placeId}`);
      const result = await computeSingleScore(request.placeId);
      results = [result];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either placeId or updateAll must be provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate summary stats
    const totalUpdated = results.length;
    const avgScoreChange = results.reduce((sum, r) => sum + r.scoreChange, 0) / totalUpdated;
    const improved = results.filter(r => r.scoreChange > 0).length;
    const decreased = results.filter(r => r.scoreChange < 0).length;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          totalUpdated,
          avgScoreChange: Math.round(avgScoreChange * 100) / 100,
          improved,
          decreased,
          unchanged: totalUpdated - improved - decreased,
        },
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
