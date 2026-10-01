import type {
  ExchangeRecord,
  AccessRequestRecord,
} from "../../shared/types/lifecycle";
import { apiUrl } from "../lib/apiUrl";
import { supabase } from "../lib/supabase";
import {
  invalidateExchangeCaches,
  invalidateRequestCaches,
} from "../lib/localStorageCache";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token)
    throw new Error("Sign in to continue.");
  const headers = new Headers(options?.headers ?? {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: "omit",
      headers,
    });
  } catch {
    throw new Error(
      "We could not reach the requests service. Please try again.",
    );
  }
  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The requests service returned an invalid response.");
  }
  if (!response.ok || !payload.success)
    throw new Error(
      payload.success
        ? "The request could not be completed."
        : (payload.error ?? "The request could not be completed."),
    );
  return payload.data;
}

export function getMyRequests(): Promise<AccessRequestRecord[]> {
  return request("/requests");
}

export function getReceivedRequests(): Promise<AccessRequestRecord[]> {
  return request("/requests/received");
}

export function getRequest(id: string): Promise<AccessRequestRecord> {
  return request(`/requests/${encodeURIComponent(id)}`);
}

export function createRequest(input: {
  listingId: string;
  requestedFrom?: string | null;
  requestedUntil?: string | null;
  message?: string | null;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/requests", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => {
    invalidateRequestCaches();
    return result;
  });
}

export function decideRequest(
  id: string,
  decision: "ACCEPT" | "REJECT",
): Promise<{ exchangeId: string | null }> {
  return request<{ exchangeId: string | null }>(
    `/requests/${encodeURIComponent(id)}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
  ).then((result) => {
    if (result.exchangeId) invalidateExchangeCaches();
    else invalidateRequestCaches();
    return result;
  });
}

export function cancelRequest(id: string): Promise<void> {
  return request<void>(`/requests/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  }).then(() => {
    invalidateRequestCaches();
  });
}

export function getExchange(id: string): Promise<ExchangeRecord> {
  return request(`/exchanges/${encodeURIComponent(id)}`);
}

export type ExchangeAction =
  | "CONFIRM_HANDOVER"
  | "CONFIRM_RECEIPT"
  | "REQUEST_RETURN"
  | "CONFIRM_RETURN";

export function performExchangeAction(
  id: string,
  action: ExchangeAction,
  notes?: string,
): Promise<void> {
  return request<void>(`/exchanges/${encodeURIComponent(id)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, notes }),
  }).then(() => {
    invalidateExchangeCaches();
  });
}
