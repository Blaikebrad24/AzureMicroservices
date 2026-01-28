import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://:redispassword@redis:6379/0";

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    console.error("Redis read error:", error);
    return null;
  }
}

export async function getCachedHash<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const value = await client.hgetall(key);
    if (value && Object.keys(value).length > 0) {
      return value as T;
    }
    return null;
  } catch (error) {
    console.error("Redis read error:", error);
    return null;
  }
}
