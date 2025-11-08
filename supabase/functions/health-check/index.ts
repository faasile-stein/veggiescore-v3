// Edge Function: health-check
// System health check endpoint

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const checks: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
    };

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Check database connectivity
    try {
      const { data, error } = await supabaseClient
        .from('places')
        .select('count')
        .limit(1);

      checks.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? error.message : 'Connected',
      };
    } catch (error) {
      checks.checks.database = {
        status: 'unhealthy',
        message: error.message,
      };
      checks.status = 'unhealthy';
    }

    // Check job queue (count pending jobs)
    try {
      const { data: jobs, error } = await supabaseClient
        .from('jobs')
        .select('job_type, status')
        .eq('status', 'pending');

      const queueDepth = jobs?.reduce((acc, job) => {
        acc[job.job_type] = (acc[job.job_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      checks.checks.job_queue = {
        status: 'healthy',
        pending_jobs: queueDepth,
        total_pending: jobs?.length || 0,
      };
    } catch (error) {
      checks.checks.job_queue = {
        status: 'unknown',
        message: error.message,
      };
    }

    // Check system stats
    try {
      const { count: placesCount } = await supabaseClient
        .from('places')
        .select('id', { count: 'exact', head: true });

      const { count: menusCount } = await supabaseClient
        .from('menus')
        .select('id', { count: 'exact', head: true })
        .eq('archived', false);

      const { count: itemsCount } = await supabaseClient
        .from('menu_items')
        .select('id', { count: 'exact', head: true });

      checks.stats = {
        total_places: placesCount || 0,
        total_menus: menusCount || 0,
        total_items: itemsCount || 0,
      };
    } catch (error) {
      checks.stats = {
        error: 'Could not fetch stats',
      };
    }

    const statusCode = checks.status === 'healthy' ? 200 : 503;

    return new Response(
      JSON.stringify(checks),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in health-check:', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
