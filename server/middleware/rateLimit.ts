import type { NextFunction, Request, Response } from "express";

const buckets = new Map<string, number[]>();

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  message?: string;
  key?: (request: Request) => string;
};

export function createRateLimiter(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests. Please wait a moment and try again.",
    key = (request) =>
      request.ip ||
      request.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown",
  } = options;

  return (request: Request, response: Response, next: NextFunction) => {
    const identity = key(request);
    const now = Date.now();
    const active = (buckets.get(identity) ?? []).filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (active.length >= maxRequests) {
      response.status(429).json({
        success: false,
        error: message,
      });
      return;
    }

    active.push(now);
    buckets.set(identity, active);
    next();
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
