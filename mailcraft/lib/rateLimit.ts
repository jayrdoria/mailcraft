import { redis } from '@/lib/redis'

/**
 * Redis-backed sliding-window rate limiter.
 * Returns true if the request exceeds the limit (should be blocked).
 *
 * @param key    - Unique key per subject (e.g. `login:127.0.0.1`)
 * @param limit  - Max allowed requests within the window
 * @param windowSeconds - Rolling window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  return count > limit
}
