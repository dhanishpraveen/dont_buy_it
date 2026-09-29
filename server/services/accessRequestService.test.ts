import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LifecycleError,
  createAccessRequest,
  decideAccessRequest,
  getAccessRequest,
} from "./accessRequestService.js";

const { rpc, getSupabaseUserClient } = vi.hoisted(() => {
  const rpcMock = vi.fn();
  return {
    rpc: rpcMock,
    getSupabaseUserClient: vi.fn(() => ({ rpc: rpcMock })),
  };
});
vi.mock("../config/supabase.js", () => ({ getSupabaseUserClient }));

const accessToken = "verified-test-token";
const listingId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  rpc.mockReset();
  getSupabaseUserClient.mockClear();
});

describe("access request lifecycle service", () => {
  it("normalizes dates and sends only request fields to the authenticated RPC", async () => {
    rpc.mockResolvedValue({
      data: "22222222-2222-4222-8222-222222222222",
      error: null,
    });
    const spoofedInput = {
      listingId,
      requestedFrom: "2030-10-05T10:00:00-04:00",
      requestedUntil: "2030-10-07T10:00:00-04:00",
      message: "I will take good care of it.",
      requesterId: "spoofed-requester",
      ownerId: "spoofed-owner",
    } as Parameters<typeof createAccessRequest>[0];
    const id = await createAccessRequest(spoofedInput, accessToken);

    expect(id).toBe("22222222-2222-4222-8222-222222222222");
    expect(getSupabaseUserClient).toHaveBeenCalledWith(accessToken);
    expect(rpc).toHaveBeenCalledWith("create_access_request", {
      p_listing_id: listingId,
      p_requested_from: "2030-10-05T14:00:00.000Z",
      p_requested_until: "2030-10-07T14:00:00.000Z",
      p_message: "I will take good care of it.",
    });
  });

  it("rejects invalid listing ids before calling Supabase", async () => {
    await expect(
      createAccessRequest({ listingId: "not-a-uuid" }, accessToken),
    ).rejects.toMatchObject({ status: 404 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps an owner self-request denial to the user-facing message", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "You can't request your own listing." },
    });
    await expect(
      createAccessRequest({ listingId }, accessToken),
    ).rejects.toMatchObject({
      constructor: LifecycleError,
      message: "You can't request your own listing.",
      status: 400,
    });
  });

  it("maps overlapping accepted periods to a conflict response", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "This resource is already reserved for the selected period.",
      },
    });
    await expect(
      decideAccessRequest(listingId, "ACCEPT", accessToken),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("maps an expired request period to a clear conflict response", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "This request period has already started.",
      },
    });
    await expect(
      decideAccessRequest(listingId, "ACCEPT", accessToken),
    ).rejects.toMatchObject({
      status: 409,
      message:
        "This request period has already started. Ask the requester to cancel and submit new future dates.",
    });
  });

  it("requests details through an authenticated participant-scoped RPC", async () => {
    const record = { id: listingId, status: "PENDING" };
    rpc.mockResolvedValue({ data: [record], error: null });
    await expect(getAccessRequest(listingId, accessToken)).resolves.toEqual(
      record,
    );
    expect(rpc).toHaveBeenCalledWith("get_access_requests", {
      p_scope: "all",
      p_request_id: listingId,
    });
  });

  it("rejects malformed request IDs without reaching Supabase", async () => {
    await expect(
      getAccessRequest("not-a-uuid", accessToken),
    ).rejects.toMatchObject({ status: 404 });
    expect(rpc).not.toHaveBeenCalled();
  });
});
