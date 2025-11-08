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

export default function QuestsScreen() {
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuests();
  }, []);

  async function loadQuests() {
    try {
      const data = await getUserStats();
      setQuests(data.quests || []);
    } catch (error) {
      console.error('Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderQuest({ item }: any) {
    const quest = item.quests;
    const progress = item.progress || {};
    const isCompleted = item.status === 'completed';
    const progressPercent = quest.rules.count > 0
      ? ((progress.count || 0) / quest.rules.count) * 100
      : 0;

    return (
      <View style={[styles.questCard, isCompleted && styles.questCompleted]}>
        <View style={styles.questHeader}>
          <View style={styles.questIcon}>
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'flag'}
              size={24}
              color={isCompleted ? '#22c55e' : '#666'}
            />
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
          <View style={styles.questReward}>
            <Text style={styles.questPoints}>+{quest.reward_points}</Text>
            <Text style={styles.questPointsLabel}>pts</Text>
          </View>
        </View>

        {!isCompleted && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress.count || 0} / {quest.rules.count}
            </Text>
          </View>
        )}

        {isCompleted && (
          <Text style={styles.completedText}>
            Completed {new Date(item.completed_at).toLocaleDateString()}
          </Text>
        )}
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

  if (quests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flag-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No quests available</Text>
        <Text style={styles.emptySubtext}>
          Check back later for new challenges!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={quests}
        renderItem={renderQuest}
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
  questCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questCompleted: {
    opacity: 0.7,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questIcon: {
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: '#666',
  },
  questReward: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  questPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  questPointsLabel: {
    fontSize: 10,
    color: '#666',
  },
  progressContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 12,
    color: '#666',
    minWidth: 50,
  },
  completedText: {
    marginTop: 8,
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
});
