import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export async function awardPoints(action: string, relatedType?: string, relatedId?: string, metadata?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/award-points`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      related_type: relatedType,
      related_id: relatedId,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to award points');
  }

  return await response.json();
}

export async function getUserStats() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/get-user-stats`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user stats');
  }

  return await response.json();
}

export async function getLeaderboard(scope = 'global', timeframe = 'all_time', limit = 100) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-leaderboard?scope=${scope}&timeframe=${timeframe}&limit=${limit}`,
    {
      headers: {
        'apikey': supabaseAnonKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get leaderboard');
  }

  return await response.json();
}
