import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachUser, bearerTokenFromHeader, requireAuth } from "./auth.js";
import type { SupabaseRequestUser } from "../types/auth.js";

const { resolveSupabaseUser } = vi.hoisted(() => ({
  resolveSupabaseUser: vi.fn(),
}));
vi.mock("../services/supabaseAuthService.js", () => ({ resolveSupabaseUser }));

const testUser: SupabaseRequestUser = {
  id: "de4a4b88-3999-4c37-ad7d-648c6133970b",
  name: "Verified User",
  email: "verified@example.com",
  verificationStatus: "verified",
  emailVerified: true,
  trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createTestApp() {
  const app = express();
  app.use(attachUser);
  app.get("/private", requireAuth, (request, response) =>
    response.json({ id: request.user?.id }),
  );
  return app;
}

describe("Supabase bearer authentication middleware", () => {
  beforeEach(() => resolveSupabaseUser.mockReset());

  it("extracts bearer tokens case-insensitively", () => {
    expect(bearerTokenFromHeader("Bearer abc.def")).toBe("abc.def");
    expect(bearerTokenFromHeader("bearer token-value")).toBe("token-value");
    expect(bearerTokenFromHeader("Basic token-value")).toBeNull();
    expect(bearerTokenFromHeader(undefined)).toBeNull();
  });

  it("rejects protected requests without a valid Supabase session", async () => {
    resolveSupabaseUser.mockResolvedValue(null);
    const response = await request(createTestApp()).get("/private");
    expect(response.status).toBe(401);
  });

  it("sets request identity only after the Supabase resolver validates the bearer token", async () => {
    resolveSupabaseUser.mockResolvedValue(testUser);
    const response = await request(createTestApp())
      .get("/private")
      .set("Authorization", "Bearer signed-supabase-access-token");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testUser.id);
    expect(resolveSupabaseUser).toHaveBeenCalledWith(
      "signed-supabase-access-token",
    );
  });

  it("rejects valid but unverified users from protected operations", async () => {
    resolveSupabaseUser.mockResolvedValue({
      ...testUser,
      emailVerified: false,
      verificationStatus: "pending",
    });
    const response = await request(createTestApp())
      .get("/private")
      .set("Authorization", "Bearer signed-supabase-access-token");
    expect(response.status).toBe(403);
  });
});
