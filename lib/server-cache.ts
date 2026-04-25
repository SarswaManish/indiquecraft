import { Role } from "@prisma/client";
import { Redis } from "@upstash/redis";

const DASHBOARD_CACHE_TTL_SECONDS = 20;
const DASHBOARD_CACHE_NAMESPACE = "dashboard:v1";
const dashboardRoles: Role[] = [
  "ADMIN",
  "OWNER",
  "ORDER_MANAGER",
  "PURCHASE_COORDINATOR",
  "PRODUCTION_MANAGER",
  "DISPATCH_MANAGER",
];

let redisClient: Redis | null | undefined;

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getTodayCacheStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function getDashboardCacheKey(role: Role) {
  return `${DASHBOARD_CACHE_NAMESPACE}:${getTodayCacheStamp()}:${role}`;
}

export async function getDashboardCache<T>(role: Role): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(getDashboardCacheKey(role));
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function setDashboardCache<T>(role: Role, value: T) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(getDashboardCacheKey(role), value, { ex: DASHBOARD_CACHE_TTL_SECONDS });
  } catch {
    // Fail open: cache should never block the request path.
  }
}

export async function invalidateDashboardCache() {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = dashboardRoles.map((role) => getDashboardCacheKey(role));
    await redis.del(...keys);
  } catch {
    // Ignore cache invalidation failures to keep write flows reliable.
  }
}

export function isRedisCacheConfigured() {
  return Boolean(getRedisClient());
}
