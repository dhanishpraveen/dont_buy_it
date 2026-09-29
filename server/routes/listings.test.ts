import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import * as listingService from "../services/listingService.js";
import { ListingDatabaseError } from "../services/supabaseListingService.js";
import type { SupabaseRequestUser } from "../types/auth.js";

const { usersByToken, resolveSupabaseUser } = vi.hoisted(() => {
  const users = new Map<string, SupabaseRequestUser>();
  return {
    usersByToken: users,
    resolveSupabaseUser: vi.fn((token: string) =>
      Promise.resolve(users.get(token) ?? null),
    ),
  };
});
vi.mock("../services/supabaseAuthService.js", () => ({ resolveSupabaseUser }));

process.env.DATABASE_MODE = "mock";
const listingInput = {
  name: "Community Projector",
  description: "A compact projector for presentations and movie nights.",
  category: "Electronics",
  images: ["https://example.com/projector.jpg"],
  condition: "Good",
  capabilities: ["HDMI", "display presentation slides"],
  accessType: "borrow",
  price: 0,
  priceUnit: "free",
  availability: "available",
  location: "Adyar, Chennai",
  availableFrom: "tomorrow",
};

function verifiedAgent(name: string) {
  const token = randomUUID();
  const now = new Date().toISOString();
  usersByToken.set(token, {
    id: randomUUID(),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, "-")}@example.com`,
    emailVerified: true,
    phoneVerified: true,
    verificationStatus: "verified",
    trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 },
    createdAt: now,
    updatedAt: now,
  });
  return { agent: request.agent(app), token };
}

function authed(session: ReturnType<typeof verifiedAgent>) {
  return {
    get: (path: string) =>
      session.agent.get(path).set("Authorization", `Bearer ${session.token}`),
    post: (path: string) =>
      session.agent.post(path).set("Authorization", `Bearer ${session.token}`),
    patch: (path: string) =>
      session.agent.patch(path).set("Authorization", `Bearer ${session.token}`),
    delete: (path: string) =>
      session.agent
        .delete(path)
        .set("Authorization", `Bearer ${session.token}`),
  };
}

beforeEach(() => {
  usersByToken.clear();
  resolveSupabaseUser.mockClear();
});

describe("listing API with Supabase request identity", () => {
  it("returns structured database diagnostics only outside production", async () => {
    const owner = authed(verifiedAgent("Diagnostic Owner"));
    const originalNodeEnv = process.env.NODE_ENV;
    const createListingSpy = vi
      .spyOn(listingService, "createListing")
      .mockRejectedValue(
        new ListingDatabaseError(
          "We could not publish this listing.",
          "42P17",
          'infinite recursion detected in policy for relation "listings"',
        ),
      );

    try {
      process.env.NODE_ENV = "development";
      const development = await owner
        .post("/api/listings")
        .send(listingInput)
        .expect(400);
      expect(development.body).toMatchObject({
        error: "We could not publish this listing.",
        code: "42P17",
        details:
          'infinite recursion detected in policy for relation "listings"',
      });

      process.env.NODE_ENV = "production";
      const production = await owner
        .post("/api/listings")
        .send(listingInput)
        .expect(400);
      expect(production.body).toEqual({
        success: false,
        error: "We could not publish the listing. Please try again.",
      });
    } finally {
      createListingSpy.mockRestore();
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("rejects unauthenticated creation and invalid pricing", async () => {
    await request(app).post("/api/listings").send(listingInput).expect(401);
    const owner = authed(verifiedAgent("Price Owner"));
    const response = await owner.post("/api/listings").send({
      ...listingInput,
      accessType: "borrow",
      price: 100,
      priceUnit: "one-time",
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("price of zero");
  });

  it("creates, browses, searches, updates, and soft-deletes an owned listing", async () => {
    const ownerSession = verifiedAgent("Listing Owner");
    const owner = authed(ownerSession);
    const ownerId = usersByToken.get(ownerSession.token)!.id;
    const created = await owner
      .post("/api/listings")
      .send({ ...listingInput, ownerId: "another-user-id" });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      item: { name: "Community Projector", condition: "Good" },
      accessType: "borrow",
      location: "Adyar, Chennai",
      status: "active",
    });
    expect(created.body.data.owner.id).toBe(ownerId);
    expect(created.body.data.owner).not.toHaveProperty("email");
    const id = created.body.data.id;

    const publicList = await request(app)
      .get("/api/listings")
      .query({ search: "projector" });
    expect(publicList.status).toBe(200);
    expect(
      publicList.body.data.some((listing: { id: string }) => listing.id === id),
    ).toBe(true);
    const ownerBrowse = await owner
      .get("/api/listings")
      .query({ search: "projector" });
    expect(ownerBrowse.status).toBe(200);
    expect(
      ownerBrowse.body.data.some(
        (listing: { id: string }) => listing.id === id,
      ),
    ).toBe(false);
    const communityViewer = authed(verifiedAgent("Community Viewer"));
    const communityView = await communityViewer
      .get("/api/listings")
      .query({ search: "projector" });
    expect(communityView.status).toBe(200);
    expect(
      communityView.body.data.some(
        (listing: { id: string }) => listing.id === id,
      ),
    ).toBe(true);
    await request(app).get(`/api/listings/${id}`).expect(200);
    const matched = await request(app)
      .post("/api/resources/match")
      .send({
        requirement: {
          item: "projector",
          purpose: "presentation",
          duration: null,
          frequency: null,
          date: "tomorrow",
          location: null,
          urgency: null,
          budget: null,
          requiredCapabilities: [],
        },
      });
    expect(matched.status).toBe(200);
    expect(
      matched.body.data.some((option: { id: string }) => option.id === id),
    ).toBe(true);

    const mine = await owner.get("/api/users/me/listings");
    expect(mine.status).toBe(200);
    expect(
      mine.body.data.some((listing: { id: string }) => listing.id === id),
    ).toBe(true);

    const updated = await owner
      .patch(`/api/listings/${id}`)
      .send({ status: "paused", location: "Besant Nagar, Chennai" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("paused");
    expect(updated.body.data.location).toBe("Besant Nagar, Chennai");
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
    await owner.get(`/api/listings/${id}`).expect(200);
    const otherViewer = authed(verifiedAgent("Other Viewer"));
    await otherViewer.get(`/api/listings/${id}`).expect(404);

    await owner.delete(`/api/listings/${id}`).expect(200);
    expect(
      (await owner.get("/api/users/me/listings")).body.data.find(
        (listing: { id: string }) => listing.id === id,
      ).status,
    ).toBe("closed");
  });

  it("rejects another verified user from modifying a listing", async () => {
    const owner = authed(verifiedAgent("Owner"));
    const other = authed(verifiedAgent("Other User"));
    const created = await owner
      .post("/api/listings")
      .send({ ...listingInput, name: "Owner Camera" })
      .expect(201);
    const id = created.body.data.id;
    expect(
      (
        await other
          .patch(`/api/listings/${id}`)
          .send({ name: "Stolen Listing" })
      ).status,
    ).toBe(403);
    expect((await other.delete(`/api/listings/${id}`)).status).toBe(403);
  });
});
