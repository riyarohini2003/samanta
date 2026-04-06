import { NextRequest } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

type WindowEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;
  const windows = new Map<string, WindowEntry>();

  // Automatic cleanup of expired entries every 60 seconds
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now >= entry.resetAt) {
        windows.delete(key);
      }
    }
  }, 60_000);

  // Allow the process to exit even if the interval is still active
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = windows.get(key);

    // If no entry exists or the window has expired, start a fresh window
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;
      windows.set(key, { count: 1, resetAt });
      return { success: true, remaining: maxRequests - 1, resetAt };
    }

    // Window is still active -- increment the count
    entry.count += 1;

    if (entry.count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      success: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  };
}

// Pre-configured limiters for common use cases
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

/**
 * Extract the client IP address from a NextRequest.
 * Checks x-forwarded-for and x-real-ip headers, falling back to "unknown".
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
