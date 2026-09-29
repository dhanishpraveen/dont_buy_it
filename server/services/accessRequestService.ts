import { getSupabaseUserClient } from "../config/supabase.js";
import type {
  AccessRequestRecord,
  ExchangeRecord,
  LifecycleAccessType,
  LifecycleListing,
} from "../../shared/types/lifecycle.js";

export type RequestScope = "mine" | "received";
export type RequestDecision = "ACCEPT" | "REJECT";
export type ExchangeAction =
  | "CONFIRM_HANDOVER"
  | "CONFIRM_RECEIPT"
  | "REQUEST_RETURN"
  | "CONFIRM_RETURN";

export class LifecycleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LifecycleError";
  }
}

function sessionClient(accessToken: string | undefined) {
  if (!accessToken)
    throw new LifecycleError(
      "Your session has expired. Please sign in again.",
      401,
    );
  return getSupabaseUserClient(accessToken);
}

function requireUuid(id: string, label: "Request" | "Exchange") {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new LifecycleError(`${label} not found.`, 404);
  }
}

function mapDatabaseError(
  error: { code?: string; message?: string },
  fallback: string,
): LifecycleError {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "42501" || message.includes("permission")) {
    return new LifecycleError(
      "You don't have permission to perform this action.",
      403,
    );
  }
  if (message.includes("request not found"))
    return new LifecycleError("Request not found.", 404);
  if (message.includes("exchange not found"))
    return new LifecycleError("Exchange not found.", 404);
  if (message.includes("own listing"))
    return new LifecycleError("You can't request your own listing.", 400);
  if (message.includes("already reserved"))
    return new LifecycleError(
      "This resource is already reserved for the selected period.",
      409,
    );
  if (message.includes("pending request"))
    return new LifecycleError(
      "You already have a pending request for this listing.",
      409,
    );
  if (message.includes("already processed"))
    return new LifecycleError("This request has already been processed.", 409);
  if (message.includes("no longer available"))
    return new LifecycleError("This listing is no longer available.", 409);
  if (
    message.includes("not available in the current state") ||
    message.includes("return has not been requested")
  ) {
    return new LifecycleError(
      "This action is not available in the current state.",
      409,
    );
  }
  if (
    message.includes("start date") ||
    message.includes("end date") ||
    message.includes("date")
  ) {
    return new LifecycleError(
      error.message ?? "Check the requested dates.",
      400,
    );
  }
  console.error("[Supabase lifecycle]", error.code ?? "unknown", fallback);
  return new LifecycleError(fallback, 500);
}

function parsedDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string")
    throw new LifecycleError(`Choose a valid ${field}.`, 400);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds))
    throw new LifecycleError(`Choose a valid ${field}.`, 400);
  return new Date(milliseconds).toISOString();
}

export async function createAccessRequest(
  input: {
    listingId: unknown;
    requestedFrom?: unknown;
    requestedUntil?: unknown;
    message?: unknown;
  },
  accessToken?: string,
): Promise<string> {
  if (
    typeof input.listingId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.listingId,
    )
  ) {
    throw new LifecycleError("This listing is no longer available.", 404);
  }
  if (
    input.message !== undefined &&
    input.message !== null &&
    typeof input.message !== "string"
  ) {
    throw new LifecycleError("Enter a valid message.", 400);
  }
  const message =
    typeof input.message === "string" ? input.message.trim() : null;
  if (message && message.length > 2000)
    throw new LifecycleError("Keep your message under 2,000 characters.", 400);
  const { data, error } = await sessionClient(accessToken).rpc(
    "create_access_request",
    {
      p_listing_id: input.listingId,
      p_requested_from: parsedDate(input.requestedFrom, "start date"),
      p_requested_until: parsedDate(input.requestedUntil, "end date"),
      p_message: message,
    },
  );
  if (error)
    throw mapDatabaseError(
      error,
      "We could not send your request. Please try again.",
    );
  if (typeof data !== "string")
    throw new LifecycleError(
      "We could not confirm your request. Please try again.",
      500,
    );
  return data;
}

export async function getAccessRequests(
  scope: RequestScope,
  accessToken?: string,
): Promise<AccessRequestRecord[]> {
  const { data, error } = await sessionClient(accessToken).rpc(
    "get_access_requests",
    {
      p_scope: scope,
      p_request_id: null,
    },
  );
  if (error)
    throw mapDatabaseError(error, "We could not load access requests.");
  return (Array.isArray(data) ? data : []) as AccessRequestRecord[];
}

export async function getAccessRequest(
  id: string,
  accessToken?: string,
): Promise<AccessRequestRecord | null> {
  requireUuid(id, "Request");
  const { data, error } = await sessionClient(accessToken).rpc(
    "get_access_requests",
    {
      p_scope: "all",
      p_request_id: id,
    },
  );
  if (error) throw mapDatabaseError(error, "We could not load this request.");
  return Array.isArray(data)
    ? ((data[0] as AccessRequestRecord | undefined) ?? null)
    : null;
}

export async function decideAccessRequest(
  id: string,
  decision: RequestDecision,
  accessToken?: string,
): Promise<string | null> {
  requireUuid(id, "Request");
  const { data, error } = await sessionClient(accessToken).rpc(
    "decide_access_request",
    {
      p_request_id: id,
      p_decision: decision,
    },
  );
  if (error)
    throw mapDatabaseError(
      error,
      "We could not process this request. Please try again.",
    );
  return typeof data === "string" ? data : null;
}

export async function cancelAccessRequest(
  id: string,
  accessToken?: string,
): Promise<void> {
  requireUuid(id, "Request");
  const { error } = await sessionClient(accessToken).rpc(
    "cancel_access_request",
    { p_request_id: id },
  );
  if (error)
    throw mapDatabaseError(
      error,
      "We could not cancel this request. Please try again.",
    );
}

export async function getExchange(
  id: string,
  accessToken?: string,
): Promise<ExchangeRecord> {
  requireUuid(id, "Exchange");
  const { data, error } = await sessionClient(accessToken).rpc(
    "get_exchange_details",
    { p_exchange_id: id },
  );
  if (error) throw mapDatabaseError(error, "We could not load this exchange.");
  if (!data || typeof data !== "object")
    throw new LifecycleError("Exchange not found.", 404);
  return data as ExchangeRecord;
}

export async function advanceExchange(
  id: string,
  action: ExchangeAction,
  notes: unknown,
  accessToken?: string,
): Promise<void> {
  requireUuid(id, "Exchange");
  if (notes !== undefined && notes !== null && typeof notes !== "string")
    throw new LifecycleError("Enter a valid note.", 400);
  const value = typeof notes === "string" ? notes.trim() : null;
  if (value && value.length > 2000)
    throw new LifecycleError("Keep your note under 2,000 characters.", 400);
  const { error } = await sessionClient(accessToken).rpc("advance_exchange", {
    p_exchange_id: id,
    p_action: action,
    p_notes: value,
  });
  if (error)
    throw mapDatabaseError(
      error,
      "We could not update this exchange. Please try again.",
    );
}
