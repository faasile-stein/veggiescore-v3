/**
 * Redis Caching Layer for VeggieScore
 *
 * Provides caching utilities for:
 * - Menu data
 * - Search results
 * - User stats
 * - Leaderboards
 */

const Redis = require('ioredis');

class CacheManager {
  constructor(options = {}) {
    this.redis = new Redis({
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || process.env.REDIS_PORT || 6379,
      password: options.password || process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      ...options,
    });

    this.redis.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });

    this.redis.on('connect', () => {
      console.log('[Redis] Connected');
    });

    // Default TTLs (in seconds)
    this.ttls = {
      menu: 30 * 24 * 60 * 60,  // 30 days
      place: 24 * 60 * 60,  // 1 day
      search: 5 * 60,  // 5 minutes
      leaderboard: 5 * 60,  // 5 minutes
      userStats: 1 * 60,  // 1 minute
      popularPlaces: 1 * 60 * 60,  // 1 hour
    };
  }

  /**
   * Generic get/set with TTL
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[Redis] Get error for ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[Redis] Set error for ${key}:`, error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`[Redis] Delete error for ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`[Redis] Delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Cache with automatic fallback to database
   */
  async cacheOrFetch(key, fetchFn, ttl = 3600) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const data = await fetchFn();

    // Store in cache
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }

    return data;
  }

  /**
   * Menu caching
   */
  async getMenu(menuId) {
    return this.get(`menu:${menuId}`);
  }

  async setMenu(menuId, menuData) {
    return this.set(`menu:${menuId}`, menuData, this.ttls.menu);
  }

  async invalidateMenu(menuId) {
    return this.delete(`menu:${menuId}`);
  }

  /**
   * Place caching
   */
  async getPlace(placeId) {
    return this.get(`place:${placeId}`);
  }

  async setPlace(placeId, placeData) {
    return this.set(`place:${placeId}`, placeData, this.ttls.place);
  }

  async invalidatePlace(placeId) {
    // Invalidate place and related data
    await this.delete(`place:${placeId}`);
    await this.deletePattern(`search:*:${placeId}`);
    return true;
  }

  /**
   * Search result caching
   */
  async getSearchResults(query, filters = {}) {
    const key = this.searchKey(query, filters);
    return this.get(key);
  }

  async setSearchResults(query, filters, results) {
    const key = this.searchKey(query, filters);
    return this.set(key, results, this.ttls.search);
  }

  searchKey(query, filters) {
    const filterStr = JSON.stringify(filters);
    const hash = require('crypto')
      .createHash('md5')
      .update(query + filterStr)
      .digest('hex');
    return `search:${hash}`;
  }

  /**
   * Leaderboard caching
   */
  async getLeaderboard(scope, timeframe) {
    return this.get(`leaderboard:${scope}:${timeframe}`);
  }

  async setLeaderboard(scope, timeframe, data) {
    return this.set(`leaderboard:${scope}:${timeframe}`, data, this.ttls.leaderboard);
  }

  async invalidateLeaderboards() {
    return this.deletePattern('leaderboard:*');
  }

  /**
   * User stats caching
   */
  async getUserStats(userId) {
    return this.get(`user_stats:${userId}`);
  }

  async setUserStats(userId, stats) {
    return this.set(`user_stats:${userId}`, stats, this.ttls.userStats);
  }

  async invalidateUserStats(userId) {
    return this.delete(`user_stats:${userId}`);
  }

  /**
   * Popular places caching
   */
  async getPopularPlaces(limit = 20) {
    return this.get(`popular_places:${limit}`);
  }

  async setPopularPlaces(limit, places) {
    return this.set(`popular_places:${limit}`, places, this.ttls.popularPlaces);
  }

  /**
   * Increment counter (for rate limiting, analytics)
   */
  async increment(key, ttl = 3600) {
    const value = await this.redis.incr(key);
    if (value === 1) {
      // First increment, set TTL
      await this.redis.expire(key, ttl);
    }
    return value;
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(identifier, limit, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const count = await this.increment(key, windowSeconds);
    return {
      allowed: count <= limit,
      count,
      limit,
      resetIn: await this.redis.ttl(key),
    };
  }

  /**
   * Distributed lock (for preventing race conditions)
   */
  async acquireLock(key, ttl = 10) {
    const lockKey = `lock:${key}`;
    const lockValue = Date.now().toString();

    const acquired = await this.redis.set(lockKey, lockValue, 'EX', ttl, 'NX');
    return acquired ? lockValue : null;
  }

  async releaseLock(key, lockValue) {
    const lockKey = `lock:${key}`;
    const currentValue = await this.redis.get(lockKey);

    if (currentValue === lockValue) {
      await this.redis.del(lockKey);
      return true;
    }

    return false;
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error('[Redis] Mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(pairs, ttl = 3600) {
    try {
      const pipeline = this.redis.pipeline();

      pairs.forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('[Redis] Mset error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');

      return {
        connected: true,
        info,
        memory,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Close connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Singleton instance
let cacheManager = null;

function initCache(options = {}) {
  if (!cacheManager) {
    cacheManager = new CacheManager(options);
  }
  return cacheManager;
}

function getCache() {
  if (!cacheManager) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  return cacheManager;
}

module.exports = {
  CacheManager,
  initCache,
  getCache,
};
