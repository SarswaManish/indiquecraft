import { Role } from "@prisma/client";
import { Redis } from "@upstash/redis";

const DASHBOARD_CACHE_TTL_SECONDS = 20;
const REPORTS_CACHE_TTL_SECONDS = 30;
const PRODUCTION_QUEUE_CACHE_TTL_SECONDS = 15;
const CACHE_VERSION_KEY = "read-cache:version";

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

async function getCacheVersion() {
  const redis = getRedisClient();
  if (!redis) return "nocache";

  try {
    const version = await redis.get<string>(CACHE_VERSION_KEY);
    return version ?? "1";
  } catch {
    return "1";
  }
}

function getTodayCacheStamp() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

async function getJsonCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(key);
    return cached ?? null;
  } catch {
    return null;
  }
}

async function setJsonCache<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Fail open: cache should never block request handling.
  }
}

export async function getDashboardCacheKey(role: Role) {
  const version = await getCacheVersion();
  return `dashboard:v2:${version}:${getTodayCacheStamp()}:${role}`;
}

export async function getDashboardCache<T>(role: Role): Promise<T | null> {
  return getJsonCache<T>(await getDashboardCacheKey(role));
}

export async function setDashboardCache<T>(role: Role, value: T) {
  await setJsonCache(await getDashboardCacheKey(role), value, DASHBOARD_CACHE_TTL_SECONDS);
}

export async function getReportsCacheKey(role: Role, querySignature: string) {
  const version = await getCacheVersion();
  return `reports:v1:${version}:${role}:${normalizeKeyPart(querySignature)}`;
}

export async function getReportsCache<T>(role: Role, querySignature: string): Promise<T | null> {
  return getJsonCache<T>(await getReportsCacheKey(role, querySignature));
}

export async function setReportsCache<T>(role: Role, querySignature: string, value: T) {
  await setJsonCache(
    await getReportsCacheKey(role, querySignature),
    value,
    REPORTS_CACHE_TTL_SECONDS
  );
}

export async function getProductionQueueCacheKey(role: Role, querySignature: string) {
  const version = await getCacheVersion();
  return `production-queue:v1:${version}:${role}:${normalizeKeyPart(querySignature)}`;
}

export async function getProductionQueueCache<T>(
  role: Role,
  querySignature: string
): Promise<T | null> {
  return getJsonCache<T>(await getProductionQueueCacheKey(role, querySignature));
}

export async function setProductionQueueCache<T>(
  role: Role,
  querySignature: string,
  value: T
) {
  await setJsonCache(
    await getProductionQueueCacheKey(role, querySignature),
    value,
    PRODUCTION_QUEUE_CACHE_TTL_SECONDS
  );
}

export async function invalidateReadCaches() {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.incr(CACHE_VERSION_KEY);
  } catch {
    // Ignore cache invalidation failures to keep write flows reliable.
  }
}

export function isRedisCacheConfigured() {
  return Boolean(getRedisClient());
}
