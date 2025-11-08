import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserStats } from '../lib/supabase';

const BADGE_INFO: Record<string, { name: string; description: string; icon: string }> = {
  first_discover: {
    name: 'First Steps',
    description: 'Discover your first restaurant',
    icon: '🚀',
  },
  explorer: {
    name: 'Explorer',
    description: 'Discover multiple restaurants',
    icon: '🗺️',
  },
  menu_maven: {
    name: 'Menu Maven',
    description: 'Upload many menu photos',
    icon: '📸',
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Upload a menu after 10 PM',
    icon: '🦉',
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Upload a menu before 6 AM',
    icon: '🐦',
  },
};

export default function BadgesScreen() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  async function loadBadges() {
    try {
      const data = await getUserStats();
      setBadges(data.badges || []);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderBadge({ item }: any) {
    const info = BADGE_INFO[item.badge_type] || {
      name: item.badge_type,
      description: 'Achievement unlocked',
      icon: '🏆',
    };

    const getTierColor = (tier: string | null) => {
      if (!tier) return '#22c55e';
      switch (tier) {
        case 'bronze': return '#cd7f32';
        case 'silver': return '#c0c0c0';
        case 'gold': return '#ffd700';
        default: return '#22c55e';
      }
    };

    return (
      <View style={[styles.badgeCard, { borderLeftColor: getTierColor(item.badge_tier) }]}>
        <Text style={styles.badgeIcon}>{info.icon}</Text>
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName}>
            {info.name}
            {item.badge_tier && (
              <Text style={styles.badgeTier}> ({item.badge_tier})</Text>
            )}
          </Text>
          <Text style={styles.badgeDescription}>{info.description}</Text>
          <Text style={styles.badgeDate}>
            Unlocked {new Date(item.awarded_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (badges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="ribbon-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No badges yet</Text>
        <Text style={styles.emptySubtext}>
          Complete actions to unlock achievements!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={badges}
        renderItem={renderBadge}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeTier: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 12,
    color: '#999',
  },
});
