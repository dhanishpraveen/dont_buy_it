import { supabase } from "../lib/supabase";

export type ListingView = {
  id: string;
  owner: { id: string; name: string; trustScore: number };
  item: {
    name: string;
    description: string;
    category: string;
    images: string[];
    condition: string;
    capabilities: string[];
  };
  accessType: "borrow" | "rent" | "buy-used" | "buy-new";
  price: number;
  priceUnit: "free" | "per-day" | "per-week" | "one-time";
  availability: "available" | "partially-available" | "unavailable";
  availableFrom: string | null;
  availableUntil: string | null;
  location: string;
  status:
    | "draft"
    | "active"
    | "paused"
    | "unavailable"
    | "sold"
    | "archived"
    | "closed";
  title?: string;
  deposit?: number;
  currency?: string;
  distanceKm?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type ListingResponse =
  | { success: true; data: ListingView | ListingView[] }
  | { success: false; error?: string; code?: string; details?: string };
export type ListingQuery = {
  search?: string;
  category?: string;
  accessType?: string;
  condition?: string;
  availability?: string;
  location?: string;
  sort?: string;
};

async function request(
  path: string,
  options?: RequestInit,
): Promise<ListingView | ListingView[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(options?.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (session?.access_token)
    headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "omit",
    headers,
  });
  const payload = (await response.json()) as ListingResponse;
  if (!response.ok || !payload.success)
    throw new Error(
      payload.success
        ? "Listing request failed."
        : payload.error
          ? import.meta.env.DEV && payload.details
            ? `${payload.error} (${payload.code ?? "database"}: ${payload.details})`
            : payload.error
          : "Listing request failed.",
    );
  return payload.data;
}

export async function getPublishedListings(
  query: ListingQuery = {},
): Promise<ListingView[]> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return (await request(
    `/listings${params.size ? `?${params.toString()}` : ""}`,
  )) as ListingView[];
}

export async function getMyListings(): Promise<ListingView[]> {
  return (await request("/users/me/listings")) as ListingView[];
}

export async function getListing(id: string): Promise<ListingView> {
  return (await request(`/listings/${encodeURIComponent(id)}`)) as ListingView;
}

export async function createListing(
  input: Record<string, unknown>,
): Promise<ListingView> {
  return (await request("/listings", {
    method: "POST",
    body: JSON.stringify(input),
  })) as ListingView;
}

export async function updateListing(
  id: string,
  input: Record<string, unknown>,
): Promise<ListingView> {
  return (await request(`/listings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })) as ListingView;
}

export async function deleteListing(id: string): Promise<void> {
  await request(`/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
