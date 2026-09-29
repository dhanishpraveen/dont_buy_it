import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import type { SupabaseRequestUser } from "../types/auth.js";

const mocks = vi.hoisted(() => ({
  usersByToken: new Map<string, SupabaseRequestUser>(),
  resolveSupabaseUser: vi.fn(),
  createAccessRequest: vi.fn(),
  getAccessRequest: vi.fn(),
  getAccessRequests: vi.fn(),
  decideAccessRequest: vi.fn(),
  cancelAccessRequest: vi.fn(),
  getExchange: vi.fn(),
  advanceExchange: vi.fn(),
}));

vi.mock("../services/supabaseAuthService.js", () => ({
  resolveSupabaseUser: (token: string) =>
    Promise.resolve(mocks.usersByToken.get(token) ?? null),
}));
vi.mock("../services/accessRequestService.js", () => ({
  LifecycleError: class LifecycleError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
  createAccessRequest: mocks.createAccessRequest,
  getAccessRequest: mocks.getAccessRequest,
  getAccessRequests: mocks.getAccessRequests,
  decideAccessRequest: mocks.decideAccessRequest,
  cancelAccessRequest: mocks.cancelAccessRequest,
  getExchange: mocks.getExchange,
  advanceExchange: mocks.advanceExchange,
}));

process.env.DATABASE_MODE = "mock";

function authed(name: string) {
  const token = randomUUID();
  const now = new Date().toISOString();
  mocks.usersByToken.set(token, {
    id: randomUUID(),
    name,
    email: `${name.toLowerCase()}@example.com`,
    emailVerified: true,
    verificationStatus: "verified",
    trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 },
    createdAt: now,
    updatedAt: now,
  });
  return { token, agent: request.agent(app) };
}

function withToken(session: ReturnType<typeof authed>) {
  return {
    get: (path: string) =>
      session.agent.get(path).set("Authorization", `Bearer ${session.token}`),
    post: (path: string) =>
      session.agent.post(path).set("Authorization", `Bearer ${session.token}`),
  };
}

beforeEach(() => {
  mocks.usersByToken.clear();
  Object.values(mocks).forEach((mock) => {
    if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
  });
});

describe("access request and exchange API", () => {
  it("requires verified authentication for private request routes", async () => {
    await request(app).get("/api/requests").expect(401);
    await request(app)
      .post("/api/exchanges/id/actions")
      .send({ action: "CONFIRM_HANDOVER" })
      .expect(401);
  });

  it("scopes requester and owner request lists and forwards the verified token", async () => {
    const session = authed("Requester");
    const client = withToken(session);
    mocks.getAccessRequests.mockResolvedValue([]);
    await client.get("/api/requests").expect(200);
    await client.get("/api/requests/received").expect(200);
    expect(mocks.getAccessRequests).toHaveBeenNthCalledWith(
      1,
      "mine",
      session.token,
    );
    expect(mocks.getAccessRequests).toHaveBeenNthCalledWith(
      2,
      "received",
      session.token,
    );
  });

  it("does not accept arbitrary decisions or exchange actions", async () => {
    const client = withToken(authed("Member"));
    await client
      .post("/api/requests/id/decision")
      .send({ decision: "COMPLETED" })
      .expect(400);
    await client
      .post("/api/exchanges/id/actions")
      .send({ action: "CANCEL" })
      .expect(400);
    expect(mocks.decideAccessRequest).not.toHaveBeenCalled();
    expect(mocks.advanceExchange).not.toHaveBeenCalled();
  });

  it("passes only the requested decision through the owner decision endpoint", async () => {
    const session = authed("Owner");
    const client = withToken(session);
    mocks.decideAccessRequest.mockResolvedValue("exchange-id");
    const response = await client
      .post("/api/requests/request-id/decision")
      .send({ decision: "ACCEPT", ownerId: "spoofed-owner" })
      .expect(200);
    expect(response.body.data.exchangeId).toBe("exchange-id");
    expect(mocks.decideAccessRequest).toHaveBeenCalledWith(
      "request-id",
      "ACCEPT",
      session.token,
    );
  });

  it("forwards exchange actions only with the verified session", async () => {
    const session = authed("Participant");
    const client = withToken(session);
    mocks.advanceExchange.mockResolvedValue(undefined);
    await client
      .post("/api/exchanges/exchange-id/actions")
      .send({ action: "REQUEST_RETURN", notes: "Returning today." })
      .expect(200);
    expect(mocks.advanceExchange).toHaveBeenCalledWith(
      "exchange-id",
      "REQUEST_RETURN",
      "Returning today.",
      session.token,
    );
  });
});
