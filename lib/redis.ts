import { createClient, RedisClientType } from 'redis';

// Redis client instance
let redisClient: RedisClientType | null = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Performance metrics
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalOperations: number;
  averageResponseTime: number;
}

const metrics: PerformanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  totalOperations: 0,
  averageResponseTime: 0
};

// Redis configuration
const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_delay: 1000,
  max_retry_delay: 5000,
  connect_timeout: 10000,
  lazyConnect: true
};

/**
 * Initialize Redis client with error handling and retry logic
 */
async function initializeRedis(): Promise<RedisClientType | null> {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    console.log('🔄 Initializing Redis client...');
    
    redisClient = createClient({
      url: REDIS_CONFIG.url,
      socket: {
        connectTimeout: REDIS_CONFIG.connect_timeout
      }
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('❌ Redis client error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('🔗 Redis client connected');
      isConnected = true;
      connectionAttempts = 0;
    });

    redisClient.on('disconnect', () => {
      console.log('🔌 Redis client disconnected');
      isConnected = false;
    });

    // Attempt connection
    await redisClient.connect();
    
    console.log('✅ Redis client initialized successfully');
    return redisClient;
    
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ Redis connection failed (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}):`, error);
    
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      console.log(`⏳ Retrying Redis connection in ${REDIS_CONFIG.retry_delay}ms...`);
      setTimeout(() => initializeRedis(), REDIS_CONFIG.retry_delay);
    } else {
      console.warn('⚠️ Redis connection failed after maximum retries. Falling back to non-cached operations.');
    }
    
    return null;
  }
}

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!redisClient || !isConnected) {
    return await initializeRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && isConnected;
}

/**
 * Redis cache operations with fallback and performance tracking
 */
export class RedisCache {
  private static async trackOperation<T>(
    operation: () => Promise<T>,
    operationType: 'hit' | 'miss' | 'set' | 'delete'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update metrics
      metrics.totalOperations++;
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.totalOperations - 1) + responseTime) / metrics.totalOperations;
      
      if (operationType === 'hit') metrics.cacheHits++;
      if (operationType === 'miss') metrics.cacheMisses++;
      
      return result;
    } catch (error) {
      console.error(`❌ Redis operation failed:`, error);
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      const operationType = value ? 'hit' : 'miss';
      
      return await this.trackOperation(async () => {
        if (value) {
          console.log(`🎯 Cache HIT: ${key}`);
          return JSON.parse(value) as T;
        } else {
          console.log(`❌ Cache MISS: ${key}`);
          return null;
        }
      }, operationType);
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      return await this.trackOperation(async () => {
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        return true;
      }, 'set');
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  static async del(key: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      return await this.trackOperation(async () => {
        const result = await client.del(key);
        console.log(`🗑️ Cache DEL: ${key}`);
        return result > 0;
      }, 'delete');
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set operations for bookmark management
   */
  static async sAdd(key: string, member: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      const result = await client.sAdd(key, member);
      console.log(`➕ Set ADD: ${key} -> ${member}`);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis SADD error for key ${key}:`, error);
      return false;
    }
  }

  static async sRem(key: string, member: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      const result = await client.sRem(key, member);
      console.log(`➖ Set REM: ${key} -> ${member}`);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis SREM error for key ${key}:`, error);
      return false;
    }
  }

  static async sIsMember(key: string, member: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      const result = await client.sIsMember(key, member);
      console.log(`🔍 Set CHECK: ${key} -> ${member} = ${result}`);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis SISMEMBER error for key ${key}:`, error);
      return false;
    }
  }

  static async sMembers(key: string): Promise<string[]> {
    const client = await getRedisClient();
    if (!client) return [];

    try {
      const members = await client.sMembers(key);
      console.log(`📋 Set MEMBERS: ${key} -> ${members.length} items`);
      return members;
    } catch (error) {
      console.error(`❌ Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): PerformanceMetrics & { hitRate: number } {
    const hitRate = metrics.totalOperations > 0 
      ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 
      : 0;
    
    return {
      ...metrics,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clear all cache (useful for testing)
   */
  static async flushAll(): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.flushAll();
      console.log('🧹 Cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Redis FLUSHALL error:', error);
      return false;
    }
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  articles: (searchQuery?: string) => searchQuery ? `articles:${searchQuery}` : 'articles:all',
  session: (sessionId: string) => `session:${sessionId}`,
  bookmarks: (sessionId: string) => `bookmarks:${sessionId}`,
  bookmarkData: (sessionId: string) => `bookmark_data:${sessionId}`,
  linkedinContent: (articleId: string) => `linkedin:${articleId}`,
  searchResults: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  userBookmarkCount: (sessionId: string) => `bookmark_count:${sessionId}`
};

// Initialize Redis on module load
initializeRedis().catch(console.error);

export default RedisCache;