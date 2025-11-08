import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlaces();
  }, []);

  async function loadPlaces() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, address, veggie_score, cuisine_types')
        .order('veggie_score', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading places:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchPlaces() {
    if (!query.trim()) {
      loadPlaces();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, address, veggie_score, cuisine_types')
        .ilike('name', `%${query}%`)
        .order('veggie_score', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderPlace({ item }: any) {
    return (
      <TouchableOpacity
        style={styles.placeCard}
        onPress={() => navigation.navigate('PlaceDetails', { placeId: item.id })}
      >
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{item.name}</Text>
          <Text style={styles.placeAddress}>{item.address}</Text>
          {item.cuisine_types && (
            <Text style={styles.cuisineTypes}>{item.cuisine_types.join(', ')}</Text>
          )}
        </View>
        {item.veggie_score && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>VeggieScore</Text>
            <Text style={styles.scoreValue}>{item.veggie_score}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchPlaces}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#22c55e" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderPlace}
          keyExtractor={(item) => item.id}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  placeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cuisineTypes: {
    fontSize: 12,
    color: '#888',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#fff',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});
