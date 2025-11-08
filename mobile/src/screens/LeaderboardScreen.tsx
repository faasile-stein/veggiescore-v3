import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLeaderboard } from '../lib/supabase';

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all_time');

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const data = await getLeaderboard('global', timeframe, 100);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderLeaderEntry({ item }: any) {
    const getMedalColor = (rank: number) => {
      if (rank === 1) return '#ffd700';
      if (rank === 2) return '#c0c0c0';
      if (rank === 3) return '#cd7f32';
      return '#666';
    };

    return (
      <View style={styles.leaderEntry}>
        <View style={[styles.rankBadge, { backgroundColor: getMedalColor(item.rank) }]}>
          {item.rank <= 3 ? (
            <Ionicons name="trophy" size={20} color="#fff" />
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.userLevel}>{item.level}</Text>
        </View>
        <Text style={styles.points}>{item.total_points}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'daily' && styles.timeframeActive]}
          onPress={() => setTimeframe('daily')}
        >
          <Text style={[styles.timeframeText, timeframe === 'daily' && styles.timeframeTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'weekly' && styles.timeframeActive]}
          onPress={() => setTimeframe('weekly')}
        >
          <Text style={[styles.timeframeText, timeframe === 'weekly' && styles.timeframeTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'all_time' && styles.timeframeActive]}
          onPress={() => setTimeframe('all_time')}
        >
          <Text style={[styles.timeframeText, timeframe === 'all_time' && styles.timeframeTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#22c55e" style={styles.loader} />
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderEntry}
          keyExtractor={(item, index) => `${item.user_id}-${index}`}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeframeActive: {
    backgroundColor: '#22c55e',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  leaderEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userLevel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
});
