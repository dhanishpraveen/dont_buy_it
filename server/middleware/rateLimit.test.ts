import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearRateLimitBuckets, createRateLimiter } from "./rateLimit.js";

function createTestApp() {
  const app = express();
  app.use(
    createRateLimiter({
      maxRequests: 2,
      windowMs: 60_000,
      message: "Too many requests. Please wait a moment and try again.",
    }),
  );
  app.get("/ok", (_request, response) => {
    response.json({ success: true, ok: true });
  });
  return app;
}

describe("rate limiter middleware", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows a limited number of requests per client before rejecting additional traffic", async () => {
    const app = createTestApp();

    const first = await request(app).get("/ok");
    const second = await request(app).get("/ok");
    const third = await request(app).get("/ok");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error).toContain("Too many requests");
  });
});
