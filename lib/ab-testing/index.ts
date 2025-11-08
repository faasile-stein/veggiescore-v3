/**
 * A/B Testing Framework for VeggieScore
 *
 * Usage:
 *   const variant = await getVariant(userId, 'veggie_score_prominence');
 *   trackEvent(userId, 'veggie_score_prominence', 'place_detail_click');
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Experiment {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: ExperimentVariant[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  config: Record<string, any>;
  allocationPercent: number;
}

export interface ExperimentEvent {
  experimentId: string;
  userId: string;
  eventName: string;
  metadata?: Record<string, any>;
}

export class ABTestingClient {
  private supabase: SupabaseClient;
  private cache: Map<string, string> = new Map();  // userId:experimentId -> variantId

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get user's variant for an experiment
   */
  async getVariant(userId: string, experimentName: string): Promise<ExperimentVariant | null> {
    const cacheKey = `${userId}:${experimentName}`;

    // Check cache
    const cachedVariantId = this.cache.get(cacheKey);
    if (cachedVariantId) {
      return this.getVariantById(cachedVariantId);
    }

    // Get experiment
    const { data: experiment } = await this.supabase
      .from('experiments')
      .select('id')
      .eq('name', experimentName)
      .eq('status', 'running')
      .single();

    if (!experiment) {
      return null;
    }

    // Assign user to variant
    const { data: variantId } = await this.supabase
      .rpc('assign_user_to_variant', {
        p_experiment_id: experiment.id,
        p_user_id: userId,
      });

    if (variantId) {
      this.cache.set(cacheKey, variantId);
      return this.getVariantById(variantId);
    }

    return null;
  }

  /**
   * Get variant by ID
   */
  private async getVariantById(variantId: string): Promise<ExperimentVariant | null> {
    const { data: variant } = await this.supabase
      .from('experiment_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (!variant) {
      return null;
    }

    return {
      id: variant.id,
      name: variant.name,
      config: variant.config,
      allocationPercent: variant.allocation_percent,
    };
  }

  /**
   * Track an experiment event
   */
  async trackEvent(
    userId: string,
    experimentName: string,
    eventName: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Get experiment
    const { data: experiment } = await this.supabase
      .from('experiments')
      .select('id')
      .eq('name', experimentName)
      .single();

    if (!experiment) {
      console.warn(`Experiment not found: ${experimentName}`);
      return;
    }

    // Track event
    await this.supabase.rpc('track_experiment_event', {
      p_experiment_id: experiment.id,
      p_user_id: userId,
      p_event_name: eventName,
      p_metadata: metadata || {},
    });
  }

  /**
   * Get experiment results
   */
  async getResults(experimentName: string, conversionEvent?: string) {
    const { data: experiment } = await this.supabase
      .from('experiments')
      .select('id')
      .eq('name', experimentName)
      .single();

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentName}`);
    }

    const { data: results } = await this.supabase.rpc('calculate_experiment_results', {
      p_experiment_id: experiment.id,
      p_conversion_event: conversionEvent || null,
    });

    return results;
  }

  /**
   * Check if user is in variant (helper for conditional rendering)
   */
  async isInVariant(userId: string, experimentName: string, variantName: string): Promise<boolean> {
    const variant = await this.getVariant(userId, experimentName);
    return variant?.name === variantName;
  }

  /**
   * Get variant config value
   */
  async getConfig<T = any>(
    userId: string,
    experimentName: string,
    configKey: string,
    defaultValue: T
  ): Promise<T> {
    const variant = await this.getVariant(userId, experimentName);
    if (!variant || !variant.config) {
      return defaultValue;
    }
    return (variant.config[configKey] as T) ?? defaultValue;
  }
}

// Singleton instance
let abTestingClient: ABTestingClient | null = null;

export function initABTesting(supabaseUrl: string, supabaseKey: string): ABTestingClient {
  if (!abTestingClient) {
    abTestingClient = new ABTestingClient(supabaseUrl, supabaseKey);
  }
  return abTestingClient;
}

export function getABTestingClient(): ABTestingClient {
  if (!abTestingClient) {
    throw new Error('A/B Testing client not initialized. Call initABTesting() first.');
  }
  return abTestingClient;
}

// React Hook (optional)
export function useExperiment(userId: string, experimentName: string) {
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getABTestingClient();
    client.getVariant(userId, experimentName).then((v) => {
      setVariant(v);
      setLoading(false);
    });
  }, [userId, experimentName]);

  const trackEvent = useCallback(
    (eventName: string, metadata?: Record<string, any>) => {
      const client = getABTestingClient();
      client.trackEvent(userId, experimentName, eventName, metadata);
    },
    [userId, experimentName]
  );

  return {
    variant,
    loading,
    trackEvent,
    isInVariant: (variantName: string) => variant?.name === variantName,
    getConfig: <T,>(key: string, defaultValue: T) =>
      (variant?.config?.[key] as T) ?? defaultValue,
  };
}

// Add React import for hook
import { useState, useEffect, useCallback } from 'react';

export default ABTestingClient;
