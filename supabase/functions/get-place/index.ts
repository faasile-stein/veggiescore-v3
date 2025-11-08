// Edge Function: get-place
// Get detailed information about a place including menus and items

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get place ID from URL
    const url = new URL(req.url);
    const placeId = url.searchParams.get('id');

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Place ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get place details
    const { data: place, error: placeError } = await supabaseClient
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();

    if (placeError || !place) {
      return new Response(
        JSON.stringify({ error: 'Place not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get menus (non-archived only)
    const { data: menus, error: menusError } = await supabaseClient
      .from('menus')
      .select('id, menu_type, source_type, confidence_score, created_at')
      .eq('place_id', placeId)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (menusError) {
      console.error('Error fetching menus:', menusError);
    }

    // Get menu items for all menus
    let menuItems: any[] = [];
    if (menus && menus.length > 0) {
      const menuIds = menus.map(m => m.id);
      const { data: items, error: itemsError } = await supabaseClient
        .from('menu_items')
        .select('id, menu_id, section, name, description, price, currency, dietary_labels')
        .in('menu_id', menuIds)
        .order('section');

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError);
      } else {
        menuItems = items || [];
      }
    }

    // Group items by menu
    const menusWithItems = (menus || []).map(menu => ({
      ...menu,
      items: menuItems.filter(item => item.menu_id === menu.id),
    }));

    // Calculate stats
    const totalItems = menuItems.length;
    const veganItems = menuItems.filter(item =>
      item.dietary_labels?.includes('vegan')
    ).length;
    const vegetarianItems = menuItems.filter(item =>
      item.dietary_labels?.includes('vegetarian')
    ).length;

    return new Response(
      JSON.stringify({
        place: {
          ...place,
          menus: menusWithItems,
          stats: {
            total_items: totalItems,
            vegan_items: veganItems,
            vegetarian_items: vegetarianItems,
            vegan_percentage: totalItems > 0 ? Math.round((veganItems / totalItems) * 100) : 0,
            vegetarian_percentage: totalItems > 0 ? Math.round((vegetarianItems / totalItems) * 100) : 0,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-place:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
