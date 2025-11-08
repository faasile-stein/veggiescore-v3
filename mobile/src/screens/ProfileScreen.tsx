import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserStats } from '../lib/supabase';

export default function ProfileScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Level Card */}
      <View style={styles.levelCard}>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(stats.level.level) }]}>
          <Ionicons name="star" size={32} color="#fff" />
        </View>
        <View style={styles.levelInfo}>
          <Text style={styles.levelName}>{stats.level.level.toUpperCase()}</Text>
          <Text style={styles.levelPoints}>{stats.level.total_points} points</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="location" size={24} color="#22c55e" />
          <Text style={styles.statValue}>{stats.stats.places_discovered}</Text>
          <Text style={styles.statLabel}>Places</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="camera" size={24} color="#22c55e" />
          <Text style={styles.statValue}>{stats.stats.menus_uploaded}</Text>
          <Text style={styles.statLabel}>Uploads</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="ribbon" size={24} color="#22c55e" />
          <Text style={styles.statValue}>{stats.stats.badges_unlocked}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#22c55e" />
          <Text style={styles.statValue}>#{stats.stats.global_rank || '—'}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {stats.recent_activity.slice(0, 5).map((activity: any, index: number) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityReason}>{activity.reason.replace(/_/g, ' ')}</Text>
              <Text style={styles.activityDate}>
                {new Date(activity.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.activityPoints}>+{activity.points}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  levelCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    marginLeft: 16,
  },
  levelName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  levelPoints: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityReason: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
});
