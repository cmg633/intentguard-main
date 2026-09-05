import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

function getClient() {
  if (!process.env.REDIS_URL) return null;
  client ??= createClient({ url: process.env.REDIS_URL });
  return client;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const redis = getClient();
  if (!redis) return { allowed: true, remaining: limit, configured: false };
  if (!redis.isOpen) await redis.connect();
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), configured: true };
}
