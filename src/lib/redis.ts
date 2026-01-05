/**
 * Redis Client Singleton
 *
 * Best practices implemented:
 * - Singleton pattern to reuse connections across requests
 * - Lazy initialization (connects on first use)
 * - Connection pooling (built into ioredis)
 * - Graceful error handling
 * - Development vs production handling
 */

import Redis from "ioredis";

// Cache configuration
export const REDIS_CONFIG = {
  // Cache TTL in seconds (30 days)
  RESEARCH_CACHE_TTL: 30 * 24 * 60 * 60,

  // Operation timeout in milliseconds (5 seconds)
  OPERATION_TIMEOUT: 5000,

  // Key prefixes for namespacing
  KEY_PREFIX: {
    RESEARCH: "fanfic:research:",
    STATS: "fanfic:stats:",
  },
} as const;

/**
 * Wrap a promise with a timeout
 * Returns null if timeout is reached
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = REDIS_CONFIG.OPERATION_TIMEOUT
): Promise<T | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn(`[Redis] Operation timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Global Redis instance (survives hot reloads in development)
declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

/**
 * Create Redis client with proper configuration
 */
function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL not configured, caching disabled");
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      // Connection settings
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Exponential backoff with max 30 seconds
        const delay = Math.min(times * 500, 30000);
        console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },

      // Performance optimizations
      enableReadyCheck: true,
      enableOfflineQueue: true,

      // Connection timeout
      connectTimeout: 10000,

      // Keep alive for long-running connections
      keepAlive: 30000,

      // Lazy connect - don't connect until first command
      lazyConnect: true,
    });

    // Event handlers for monitoring
    client.on("connect", () => {
      console.log("[Redis] Connected to Redis server");
    });

    client.on("ready", () => {
      console.log("[Redis] Redis client ready");
    });

    client.on("error", (error) => {
      console.error("[Redis] Connection error:", error.message);
    });

    client.on("close", () => {
      console.log("[Redis] Connection closed");
    });

    return client;
  } catch (error) {
    console.error("[Redis] Failed to create client:", error);
    return null;
  }
}

/**
 * Get Redis client singleton
 * Returns null if Redis is not available (graceful degradation)
 */
export function getRedisClient(): Redis | null {
  // In development, use global to survive hot reloads
  if (process.env.NODE_ENV === "development") {
    if (!global._redis) {
      global._redis = createRedisClient() || undefined;
    }
    return global._redis || null;
  }

  // In production, create once per cold start
  if (!global._redis) {
    global._redis = createRedisClient() || undefined;
  }
  return global._redis || null;
}

/**
 * Redis cache helper functions
 * All operations have built-in timeout protection
 */
export const redisCache = {
  /**
   * Get cached data by key (with timeout)
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const data = await withTimeout(client.get(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error("[Redis] Get error:", error);
      return null;
    }
  },

  /**
   * Set cached data with TTL (with timeout)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      const result = ttlSeconds
        ? await withTimeout(client.setex(key, ttlSeconds, serialized))
        : await withTimeout(client.set(key, serialized));
      return result !== null;
    } catch (error) {
      console.error("[Redis] Set error:", error);
      return false;
    }
  },

  /**
   * Delete cached data (with timeout)
   */
  async delete(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await withTimeout(client.del(key));
      return result !== null;
    } catch (error) {
      console.error("[Redis] Delete error:", error);
      return false;
    }
  },

  /**
   * Check if key exists (with timeout)
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await withTimeout(client.exists(key));
      return result === 1;
    } catch (error) {
      console.error("[Redis] Exists error:", error);
      return false;
    }
  },

  /**
   * Increment a counter (with timeout, non-blocking)
   */
  async increment(key: string): Promise<number | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      return await withTimeout(client.incr(key));
    } catch (error) {
      console.error("[Redis] Increment error:", error);
      return null;
    }
  },

  /**
   * Get TTL remaining for a key (with timeout)
   */
  async ttl(key: string): Promise<number | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      return await withTimeout(client.ttl(key));
    } catch (error) {
      console.error("[Redis] TTL error:", error);
      return null;
    }
  },

  /**
   * Ping Redis server (health check, with timeout)
   */
  async ping(): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await withTimeout(client.ping(), 3000); // 3s timeout for ping
      return result === "PONG";
    } catch (error) {
      console.error("[Redis] Ping error:", error);
      return false;
    }
  },
};

// Export default client getter
export default getRedisClient;
