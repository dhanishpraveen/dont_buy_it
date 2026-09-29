import {
  getSupabasePublicClient,
  getSupabaseUserClient,
} from "../config/supabase.js";
import type { Coordinates } from "./locationService.js";
import { validateCoordinates } from "./locationService.js";
import {
  listingConditions,
  validateInput,
  type ListingInput,
  type ListingStatus,
  type ListingUpdate,
  type ListingView,
} from "./listingService.js";

type SupabaseClient = ReturnType<typeof getSupabasePublicClient>;
type DatabaseListing = {
  id: string;
  item_id: string;
  owner_id: string;
  access_type: string;
  title: string;
  description: string;
  price: number | string;
  price_unit: string;
  deposit: number | string;
  currency: string;
  condition: string;
  availability_status: string;
  available_from: string | null;
  available_until: string | null;
  location_area: string;
  status: string;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    name: string;
    description: string;
    category: string;
    brand: string | null;
    model: string | null;
    condition: string;
    images: string[];
    specifications: unknown;
  } | null;
  owner: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const listingSelection =
  "id,item_id,owner_id,access_type,title,description,price,price_unit,deposit,currency,condition,availability_status,available_from,available_until,location_area,status,created_at,updated_at,item:items!listings_item_id_fkey(id,name,description,category,brand,model,condition,images,specifications),owner:profiles!listings_owner_id_fkey(id,full_name,avatar_url)";
const methodToDatabase = {
  borrow: "BORROW",
  rent: "RENT",
  "buy-used": "BUY_USED",
  "buy-new": "BUY_NEW",
} as const;
const methodFromDatabase: Record<string, ListingView["accessType"]> = {
  BORROW: "borrow",
  RENT: "rent",
  BUY_USED: "buy-used",
  BUY_NEW: "buy-new",
};
const conditionFromDatabase: Record<string, ListingView["item"]["condition"]> =
  {
    NEW: "New",
    LIKE_NEW: "Like new",
    GOOD: "Good",
    FAIR: "Fair",
    POOR: "Poor",
    WELL_LOVED: "Well loved",
  };
const conditionToDatabase = (condition: string) =>
  condition.toUpperCase().replace(/\s+/g, "_");
const availabilityFromDatabase: Record<string, ListingView["availability"]> = {
  AVAILABLE: "available",
  PARTIALLY_AVAILABLE: "partially-available",
  UNAVAILABLE: "unavailable",
};
const statusFromDatabase: Record<string, ListingStatus> = {
  ACTIVE: "active",
  PAUSED: "paused",
  UNAVAILABLE: "unavailable",
  SOLD: "sold",
  ARCHIVED: "archived",
};
const statusToDatabase: Record<ListingStatus, string> = {
  draft: "PAUSED",
  active: "ACTIVE",
  paused: "PAUSED",
  unavailable: "UNAVAILABLE",
  sold: "SOLD",
  archived: "ARCHIVED",
  closed: "ARCHIVED",
};

function capabilitiesFromSpecifications(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === "string");
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { capabilities?: unknown }).capabilities)
  ) {
    return (value as { capabilities: unknown[] }).capabilities.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }
  return [];
}

function toView(
  row: DatabaseListing,
  includeOwnerId: boolean,
  distanceKm?: number,
): ListingView | null {
  if (!row.item) return null;
  const condition =
    conditionFromDatabase[row.condition] ??
    conditionFromDatabase[row.item.condition] ??
    "Good";
  const ownerName = row.owner?.full_name?.trim() || "Community member";
  return {
    id: row.id,
    owner: {
      id: includeOwnerId ? row.owner_id : "",
      name: ownerName,
      trustScore: 0,
    },
    item: {
      name: row.item.name,
      description: row.item.description,
      category: row.item.category,
      images: row.item.images ?? [],
      condition: conditionFromDatabase[row.item.condition] ?? condition,
      capabilities: capabilitiesFromSpecifications(row.item.specifications),
    },
    title: row.title,
    accessType: methodFromDatabase[row.access_type] ?? "borrow",
    price: Number(row.price),
    priceUnit: row.price_unit as ListingView["priceUnit"],
    deposit: Number(row.deposit),
    currency: row.currency.trim(),
    availability:
      availabilityFromDatabase[row.availability_status] ?? "unavailable",
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    location: row.location_area,
    distanceKm,
    status: statusFromDatabase[row.status] ?? "paused",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ListingDatabaseError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly diagnostic: string | undefined,
  ) {
    super(message);
    this.name = "ListingDatabaseError";
  }
}

function dbError(error: unknown, fallback: string): never {
  const value =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const code = typeof value.code === "string" ? value.code : undefined;
  const rawMessage =
    typeof value.message === "string"
      ? value.message
      : "Unknown database error";
  const diagnostic = rawMessage
    .replace(
      /(authorization|access[_ -]?token|password|secret)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);

  if (process.env.NODE_ENV !== "production") {
    console.error("[Supabase listings]", {
      code: code ?? "UNKNOWN",
      message: diagnostic,
    });
  } else {
    console.error("[Supabase listings]", code ?? "UNKNOWN");
  }
  throw new ListingDatabaseError(
    fallback,
    code,
    process.env.NODE_ENV !== "production" ? diagnostic : undefined,
  );
}

function userClient(accessToken: string | undefined) {
  if (!accessToken)
    throw new Error("Your session has expired. Please sign in again.");
  return getSupabaseUserClient(accessToken);
}

function databaseCondition(condition: string) {
  return conditionToDatabase(condition);
}

function databaseAvailability(availability: ListingView["availability"]) {
  return availability.toUpperCase().replace(/-/g, "_");
}

function locationPoint(input: Pick<ListingInput, "latitude" | "longitude">) {
  if (input.latitude === undefined && input.longitude === undefined)
    return undefined;
  const coordinates = validateCoordinates({
    latitude: input.latitude,
    longitude: input.longitude,
  });
  return {
    type: "Point",
    coordinates: [coordinates.longitude, coordinates.latitude],
  };
}

function toItemValues(input: ListingInput) {
  const validated = validateInput(input);
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    condition: databaseCondition(validated.condition),
    images: validated.images,
    specifications: validated.capabilities,
  };
}

function toListingValues(input: ListingInput) {
  const validated = validateInput(input);
  const point = locationPoint(input);
  return {
    access_type: methodToDatabase[input.accessType],
    title: input.title?.trim() || input.name.trim(),
    description: input.description.trim(),
    price: validated.price,
    price_unit: validated.priceUnit,
    deposit: input.deposit ?? 0,
    currency: input.currency?.trim().toUpperCase() || "INR",
    condition: databaseCondition(validated.condition),
    availability_status: databaseAvailability(validated.availability),
    available_from: input.availableFrom || null,
    available_until: input.availableUntil || null,
    location_area: input.location.trim(),
    ...(point ? { location: point } : {}),
  };
}

export async function listSupabaseListings(
  query: {
    search?: string;
    category?: string;
    accessType?: string;
    condition?: string;
    availability?: string;
    location?: string;
    sort?: string;
  } = {},
): Promise<ListingView[]> {
  const client = getSupabasePublicClient();
  let request = client
    .from("listings")
    .select(listingSelection)
    .eq("status", "ACTIVE")
    .neq("availability_status", "UNAVAILABLE")
    .limit(100);
  if (query.category) request = request.eq("item.category", query.category);
  if (query.location?.trim())
    request = request.ilike("location_area", `%${query.location.trim()}%`);
  if (query.accessType && query.accessType in methodToDatabase)
    request = request.eq(
      "access_type",
      methodToDatabase[query.accessType as keyof typeof methodToDatabase],
    );
  if (
    query.condition &&
    listingConditions.includes(
      query.condition as ListingView["item"]["condition"],
    )
  )
    request = request.eq("condition", conditionToDatabase(query.condition));
  if (query.availability && query.availability !== "All")
    request = request.eq(
      "availability_status",
      query.availability.toUpperCase().replace(/-/g, "_"),
    );
  const search = query.search?.trim().replace(/[^\p{L}\p{N}\s_-]/gu, "");
  if (search)
    request = request.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`,
    );
  request = request.order(query.sort === "price" ? "price" : "created_at", {
    ascending: query.sort === "price",
  });
  const { data, error } = await request;
  if (error) dbError(error, "We could not retrieve listings.");
  const listings = ((data ?? []) as unknown as DatabaseListing[])
    .map((row) => toView(row, false))
    .filter((row): row is ListingView => row !== null);
  let filtered = listings;
  if (search) {
    const normalizedSearch = search.toLocaleLowerCase();
    filtered = filtered.filter((listing) =>
      `${listing.title} ${listing.item.name} ${listing.item.description} ${listing.item.category}`
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    );
  }
  if (query.sort === "name")
    filtered.sort((left, right) =>
      left.item.name.localeCompare(right.item.name),
    );
  return filtered;
}

export async function listMySupabaseListings(
  ownerId: string,
  accessToken?: string,
): Promise<ListingView[]> {
  const { data, error } = await userClient(accessToken)
    .from("listings")
    .select(listingSelection)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) dbError(error, "We could not retrieve your listings.");
  return ((data ?? []) as unknown as DatabaseListing[])
    .map((row) => toView(row, true))
    .filter((row): row is ListingView => row !== null);
}

export async function getSupabaseListing(
  id: string,
  accessToken?: string,
  ownerId?: string,
): Promise<ListingView | null> {
  if (accessToken && ownerId) {
    const { data, error } = await userClient(accessToken)
      .from("listings")
      .select(listingSelection)
      .eq("id", id)
      .maybeSingle();
    if (error) dbError(error, "We could not retrieve this listing.");
    const ownedListing = data as unknown as DatabaseListing | null;
    if (ownedListing?.owner_id === ownerId) return toView(ownedListing, true);
  }
  const { data, error } = await getSupabasePublicClient()
    .from("listings")
    .select(listingSelection)
    .eq("id", id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (error) dbError(error, "We could not retrieve this listing.");
  return data ? toView(data as unknown as DatabaseListing, false) : null;
}

export async function getNearbySupabaseListings(
  coordinates: Coordinates,
  radiusKm = 100,
): Promise<ListingView[]> {
  const client = getSupabasePublicClient();
  const { data: nearby, error } = await client.rpc("nearby_listings", {
    p_longitude: coordinates.longitude,
    p_latitude: coordinates.latitude,
    p_radius_km: radiusKm,
    p_category: null,
    p_access_type: null,
    p_availability: null,
    p_limit: 100,
  });
  if (error) dbError(error, "We could not retrieve nearby listings.");
  const rows = (nearby ?? []) as Array<{
    listing_id: string;
    distance_meters: number;
  }>;
  if (!rows.length) return [];
  const { data, error: listingError } = await client
    .from("listings")
    .select(listingSelection)
    .in(
      "id",
      rows.map((row) => row.listing_id),
    );
  if (listingError)
    dbError(listingError, "We could not retrieve nearby listings.");
  const distances = new Map(
    rows.map((row) => [row.listing_id, row.distance_meters / 1000]),
  );
  return ((data ?? []) as unknown as DatabaseListing[])
    .map((row) => toView(row, false, distances.get(row.id)))
    .filter((row): row is ListingView => row !== null)
    .sort(
      (left, right) =>
        (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity),
    );
}

export async function createSupabaseListing(
  ownerId: string,
  input: ListingInput,
  accessToken?: string,
): Promise<ListingView> {
  const client = userClient(accessToken);
  const itemValues = toItemValues(input);
  const { data: item, error: itemError } = await client
    .from("items")
    .insert({ ...itemValues, owner_id: ownerId })
    .select("id")
    .single();
  if (itemError || !item) dbError(itemError, "We could not save this item.");
  const listingValues = {
    item_id: item.id,
    owner_id: ownerId,
    ...toListingValues(input),
    status: "ACTIVE",
  };
  const { data, error } = await client
    .from("listings")
    .insert(listingValues)
    .select(listingSelection)
    .single();
  if (error || !data) {
    const { error: cleanupError } = await client
      .from("items")
      .delete()
      .eq("id", item.id)
      .eq("owner_id", ownerId);
    if (cleanupError) {
      const cleanupCode =
        typeof cleanupError.code === "string" ? cleanupError.code : "UNKNOWN";
      console.error(
        "[Supabase listings] item compensation failed",
        cleanupCode,
      );
    }
    dbError(error, "We could not publish this listing.");
  }
  const listing = toView(data as unknown as DatabaseListing, true);
  if (!listing) throw new Error("We could not publish this listing.");
  return listing;
}

export async function updateSupabaseListing(
  id: string,
  ownerId: string,
  input: ListingUpdate,
  accessToken?: string,
): Promise<ListingView> {
  const client = userClient(accessToken);
  const { data: current, error: loadError } = await client
    .from("listings")
    .select(listingSelection)
    .eq("id", id)
    .maybeSingle();
  if (loadError) dbError(loadError, "We could not load this listing.");
  if (!current) throw new Error("Listing not found.");
  const row = current as unknown as DatabaseListing;
  if (row.owner_id !== ownerId || !row.item)
    throw new Error("You cannot modify this listing.");
  const currentView = toView(row, true);
  if (!currentView) throw new Error("Listing not found.");
  const merged: ListingInput = {
    name: input.name ?? currentView.item.name,
    title: input.title ?? currentView.title,
    description: input.description ?? currentView.item.description,
    category: input.category ?? currentView.item.category,
    brand: input.brand ?? row.item.brand ?? undefined,
    model: input.model ?? row.item.model ?? undefined,
    images: input.images ?? currentView.item.images,
    condition: input.condition ?? currentView.item.condition,
    capabilities: input.capabilities ?? currentView.item.capabilities,
    accessType: input.accessType ?? currentView.accessType,
    price: input.price ?? currentView.price,
    priceUnit: input.priceUnit ?? currentView.priceUnit,
    deposit: input.deposit ?? currentView.deposit,
    currency: input.currency ?? currentView.currency,
    availability: input.availability ?? currentView.availability,
    availableFrom:
      input.availableFrom === undefined
        ? currentView.availableFrom
        : input.availableFrom,
    availableUntil:
      input.availableUntil === undefined
        ? currentView.availableUntil
        : input.availableUntil,
    location: input.location ?? currentView.location,
    latitude: input.latitude,
    longitude: input.longitude,
  };
  const status = input.status
    ? Object.hasOwn(statusToDatabase, input.status)
      ? statusToDatabase[input.status]
      : null
    : row.status;
  if (!status) throw new Error("Choose a valid listing status.");
  const listingValues = { ...toListingValues(merged), status };
  const { error: itemError } = await client
    .from("items")
    .update(toItemValues(merged))
    .eq("id", row.item_id)
    .eq("owner_id", ownerId);
  if (itemError) dbError(itemError, "We could not update this item.");
  const { data, error } = await client
    .from("listings")
    .update(listingValues)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(listingSelection)
    .single();
  if (error || !data) dbError(error, "We could not update this listing.");
  const listing = toView(data as unknown as DatabaseListing, true);
  if (!listing) throw new Error("We could not update this listing.");
  return listing;
}

export async function archiveSupabaseListing(
  id: string,
  ownerId: string,
  accessToken?: string,
): Promise<void> {
  const { data, error } = await userClient(accessToken)
    .from("listings")
    .update({ status: "ARCHIVED" })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (error) dbError(error, "We could not archive this listing.");
  if (!data) throw new Error("Listing not found.");
}
