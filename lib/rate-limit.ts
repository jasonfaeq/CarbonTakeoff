// simple sliding window, in memory. on serverless every instance has its own window so this only
// slows down someone hammering the endpoint, it's not a hard global limit
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000) };
      }
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
