import { randomUUID } from "node:crypto";
import { getDatabaseMode } from "../config/database.js";
import { ItemModel } from "../models/Item.js";
import { ListingModel } from "../models/Listing.js";
import { UserModel } from "../models/User.js";
import type {
  AccessMethod,
  AccessOption,
  AvailabilityStatus,
  PriceUnit,
} from "../../shared/types/accessOptions.js";
import type { SupabaseRequestUser } from "../types/auth.js";
import {
  distanceInKm,
  pointForCoordinates,
  type Coordinates,
  validateCoordinates,
} from "./locationService.js";
import {
  archiveSupabaseListing,
  createSupabaseListing,
  getSupabaseListing,
  listMySupabaseListings,
  listSupabaseListings,
  updateSupabaseListing,
} from "./supabaseListingService.js";

export const listingConditions = [
  "New",
  "Like new",
  "Good",
  "Fair",
  "Poor",
  "Well loved",
] as const;
export const listingCategories = [
  "Tools",
  "Electronics",
  "Outdoor & Sports",
  "Furniture",
  "Home & Kitchen",
  "Books",
  "Other",
] as const;
export type ListingCondition = (typeof listingConditions)[number];
export type ListingStatus =
  | "draft"
  | "active"
  | "paused"
  | "unavailable"
  | "sold"
  | "archived"
  | "closed";

export type ListingInput = {
  name: string;
  description: string;
  category: string;
  title?: string;
  brand?: string;
  model?: string;
  images?: string[];
  condition: string;
  capabilities?: string[];
  accessType: AccessMethod;
  price?: number;
  deposit?: number;
  currency?: string;
  priceUnit?: PriceUnit;
  availability?: AvailabilityStatus;
  availableFrom?: string | null;
  availableUntil?: string | null;
  location: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

export type ListingUpdate = Partial<ListingInput> & { status?: ListingStatus };

export type ListingView = {
  id: string;
  owner: { id: string; name: string; trustScore: number };
  item: {
    name: string;
    description: string;
    category: string;
    images: string[];
    condition: ListingCondition;
    capabilities: string[];
  };
  title?: string;
  deposit?: number;
  currency?: string;
  distanceKm?: number;
  accessType: AccessMethod;
  price: number;
  priceUnit: PriceUnit;
  availability: AvailabilityStatus;
  availableFrom: string | null;
  availableUntil: string | null;
  location: string;
  locationCoordinates?: Coordinates;
  status: ListingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type StoredMockListing = ListingView & { ownerId: string };
const mockListings = new Map<string, StoredMockListing>();
const conditionScores: Record<ListingCondition, number> = {
  New: 100,
  "Like new": 95,
  Good: 82,
  Fair: 60,
  Poor: 30,
  "Well loved": 72,
};
const accessTypes: AccessMethod[] = ["borrow", "rent", "buy-used", "buy-new"];
const priceUnits: PriceUnit[] = ["free", "per-day", "per-week", "one-time"];
const availabilityStatuses: AvailabilityStatus[] = [
  "available",
  "partially-available",
  "unavailable",
];

function canonicalItemKey(name: string, category: string): string {
  const value = `${name} ${category}`.toLowerCase();
  if (value.includes("projector")) return "projector";
  if (
    value.includes("laptop") ||
    value.includes("computer") ||
    value.includes("notebook")
  )
    return "laptop";
  if (value.includes("camera") || value.includes("photography"))
    return "camera";
  if (value.includes("camp") || value.includes("tent"))
    return "camping-equipment";
  if (value.includes("drill")) return "drill";
  if (value.includes("chair") || value.includes("ergonomic"))
    return "ergonomic-chair";
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

export function validateInput(input: ListingInput): {
  condition: ListingCondition;
  price: number;
  priceUnit: PriceUnit;
  availability: AvailabilityStatus;
  capabilities: string[];
  images: string[];
} {
  if (!input.name?.trim() || input.name.trim().length > 160)
    throw new Error("Item name is required and must be under 160 characters.");
  if (!input.description?.trim() || input.description.trim().length > 2000)
    throw new Error(
      "A description is required and must be under 2,000 characters.",
    );
  if (
    !listingCategories.includes(
      input.category?.trim() as (typeof listingCategories)[number],
    )
  )
    throw new Error("Choose a valid category.");
  const title = input.title?.trim() || input.name?.trim();
  if (!title || title.length > 180)
    throw new Error(
      "A listing title is required and must be under 180 characters.",
    );
  if (!listingConditions.includes(input.condition as ListingCondition))
    throw new Error("Choose a valid condition.");
  if (!accessTypes.includes(input.accessType))
    throw new Error("Choose a valid access method.");
  if (!input.location?.trim() || input.location.trim().length > 160)
    throw new Error("An approximate location is required.");
  const price = input.price ?? 0;
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Price must be a non-negative number.");
  if (input.accessType === "borrow" && price !== 0)
    throw new Error("Borrow listings must have a price of zero.");
  const priceUnit =
    input.priceUnit ?? (input.accessType === "borrow" ? "free" : "one-time");
  if (!priceUnits.includes(priceUnit))
    throw new Error("Choose a valid price unit.");
  if (input.accessType === "borrow" && priceUnit !== "free")
    throw new Error("Borrow listings must use the free price unit.");
  if (input.accessType === "rent" && priceUnit === "free")
    throw new Error("Rental listings need a paid price unit.");
  if (
    (input.accessType === "buy-used" || input.accessType === "buy-new") &&
    priceUnit !== "one-time"
  )
    throw new Error("Sale listings must use a one-time price.");
  if (input.accessType === "rent" && price <= 0)
    throw new Error("Rental listings need a price.");
  if ((input.deposit ?? 0) < 0 || !Number.isFinite(input.deposit ?? 0))
    throw new Error("Deposit must be a non-negative number.");
  if (
    input.currency !== undefined &&
    !/^[A-Za-z]{3}$/.test(input.currency.trim())
  )
    throw new Error("Choose a valid three-letter currency code.");
  if (getDatabaseMode() === "supabase") {
    const availableFrom = input.availableFrom
      ? Date.parse(input.availableFrom)
      : null;
    const availableUntil = input.availableUntil
      ? Date.parse(input.availableUntil)
      : null;
    if (availableFrom !== null && !Number.isFinite(availableFrom))
      throw new Error("Choose a valid availability start date.");
    if (availableUntil !== null && !Number.isFinite(availableUntil))
      throw new Error("Choose a valid availability end date.");
    if (
      availableFrom !== null &&
      availableUntil !== null &&
      availableUntil <= availableFrom
    )
      throw new Error("The availability end must be after the start.");
  }
  const availability = input.availability ?? "available";
  if (!availabilityStatuses.includes(availability))
    throw new Error("Choose a valid availability status.");
  const imageInputs = (input.images ?? []).filter(
    (image): image is string =>
      typeof image === "string" && image.trim().length > 0,
  );
  if (imageInputs.length > 6) throw new Error("Add no more than six images.");
  const images = imageInputs.map((image) => {
    const value = image.trim();
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || value.length > 2048)
        throw new Error();
    } catch {
      throw new Error("Use valid HTTP or HTTPS image URLs.");
    }
    return value;
  });
  const capabilityInputs = (input.capabilities ?? []).filter(
    (capability): capability is string =>
      typeof capability === "string" && capability.trim().length > 0,
  );
  if (capabilityInputs.length > 20)
    throw new Error("Add no more than 20 item capabilities.");
  const capabilities = capabilityInputs.map((capability) => capability.trim());
  return {
    condition: input.condition as ListingCondition,
    price,
    priceUnit,
    availability,
    capabilities,
    images,
  };
}

function inputCoordinates(input: ListingInput): Coordinates | null {
  if (input.latitude === undefined && input.longitude === undefined)
    return null;
  return validateCoordinates({
    latitude: input.latitude,
    longitude: input.longitude,
  });
}

function viewFromInput(
  id: string,
  owner: SupabaseRequestUser,
  input: ListingInput,
  now: string,
): StoredMockListing {
  const validated = validateInput(input);
  const coordinates = inputCoordinates(input);
  return {
    id,
    ownerId: owner.id,
    owner: {
      id: owner.id,
      name: owner.name,
      trustScore: owner.trustSummary.score,
    },
    item: {
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      images: validated.images,
      condition: validated.condition,
      capabilities: validated.capabilities,
    },
    accessType: input.accessType,
    price: validated.price,
    priceUnit: validated.priceUnit,
    availability: validated.availability,
    availableFrom: input.availableFrom ?? null,
    availableUntil: input.availableUntil ?? null,
    location: input.location.trim(),
    locationCoordinates: coordinates ?? undefined,
    status: "active",
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

function toView(value: Record<string, unknown>): ListingView {
  const item = (value.item ?? {}) as Record<string, unknown>;
  const owner = (value.owner ?? {}) as Record<string, unknown>;
  const ownerTrust =
    owner.trustSummary && typeof owner.trustSummary === "object"
      ? (owner.trustSummary as Record<string, unknown>)
      : {};
  const locationPoint =
    value.locationPoint && typeof value.locationPoint === "object"
      ? (value.locationPoint as { type?: string; coordinates?: number[] })
      : undefined;
  const coordinates =
    locationPoint &&
    Array.isArray(locationPoint.coordinates) &&
    locationPoint.coordinates.length === 2
      ? {
          latitude: Number(locationPoint.coordinates[1]),
          longitude: Number(locationPoint.coordinates[0]),
        }
      : undefined;
  return {
    id: String(value._id ?? value.id),
    owner: {
      id: String(owner.supabaseUserId ?? owner._id ?? owner.id ?? value.owner),
      name: String(owner.name ?? "Community member"),
      trustScore: typeof ownerTrust.score === "number" ? ownerTrust.score : 0,
    },
    item: {
      name: String(item.name),
      description: String(item.description),
      category: String(item.category),
      images: Array.isArray(item.images) ? (item.images as string[]) : [],
      condition: String(item.condition) as ListingCondition,
      capabilities: Array.isArray(item.capabilities)
        ? (item.capabilities as string[])
        : [],
    },
    accessType: value.accessType as AccessMethod,
    price: Number(value.price),
    priceUnit: value.priceUnit as PriceUnit,
    availability: value.availability as AvailabilityStatus,
    availableFrom:
      typeof value.availableFrom === "string" ? value.availableFrom : null,
    availableUntil:
      typeof value.availableUntil === "string" ? value.availableUntil : null,
    location: String(value.location),
    locationCoordinates: coordinates,
    status: value.status as ListingStatus,
    notes:
      typeof value.metadata === "object" && value.metadata
        ? String((value.metadata as Record<string, unknown>).notes ?? "") ||
          undefined
        : undefined,
    createdAt: new Date(String(value.createdAt)).toISOString(),
    updatedAt: new Date(String(value.updatedAt)).toISOString(),
  };
}

async function ensureMongoOwner(owner: SupabaseRequestUser) {
  return UserModel.findOneAndUpdate(
    { supabaseUserId: owner.id },
    {
      $set: {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        trustSummary: owner.trustSummary,
      },
      $setOnInsert: { supabaseUserId: owner.id },
    },
    { new: true, upsert: true, runValidators: true },
  );
}

async function mongoOwnerId(supabaseUserId: string): Promise<string | null> {
  const owner = await UserModel.findOne({ supabaseUserId })
    .select("_id")
    .lean();
  return owner ? String(owner._id) : null;
}

async function mongoView(
  listing: Record<string, unknown>,
): Promise<ListingView> {
  return toView(listing);
}

export async function createListing(
  owner: SupabaseRequestUser,
  input: ListingInput,
  accessToken?: string,
): Promise<ListingView> {
  const validated = validateInput(input);
  const coordinates = inputCoordinates(input);
  if (getDatabaseMode() === "supabase")
    return createSupabaseListing(owner.id, input, accessToken);
  if (getDatabaseMode() === "mock") {
    const now = new Date().toISOString();
    const view = viewFromInput(randomUUID(), owner, input, now);
    mockListings.set(view.id, view);
    return view;
  }
  const mongoOwner = await ensureMongoOwner(owner);
  const item = await ItemModel.create({
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    images: validated.images,
    condition: validated.condition,
    capabilities: validated.capabilities,
    owner: mongoOwner._id,
    metadata: {
      itemKey: canonicalItemKey(input.name, input.category),
      notes: input.notes?.trim(),
    },
  });
  const listing = await ListingModel.create({
    item: item._id,
    owner: mongoOwner._id,
    accessType: input.accessType,
    price: validated.price,
    priceUnit: validated.priceUnit,
    totalCost: validated.price,
    availability: validated.availability,
    availableFrom: input.availableFrom ?? null,
    availableUntil: input.availableUntil ?? null,
    location: input.location.trim(),
    locationPoint: coordinates ? pointForCoordinates(coordinates) : undefined,
    distanceKm: 0,
    condition: validated.condition,
    conditionScore: conditionScores[validated.condition],
    trustScore: owner.trustSummary.score,
    convenienceScore: 50,
    usageSuitabilityScore: 70,
    status: "active",
    metadata: { notes: input.notes?.trim(), source: "user" },
  });
  return mongoView(
    (await ListingModel.findById(listing._id)
      .populate("item")
      .populate("owner")
      .lean()) as unknown as Record<string, unknown>,
  );
}

function sanitizePrivateLocationData<T extends ListingView>(listing: T): T {
  const { locationCoordinates: _locationCoordinates, ...safeListing } = listing;
  return safeListing as T;
}

function matchesQuery(
  view: ListingView,
  query: {
    search?: string;
    category?: string;
    accessType?: string;
    condition?: string;
    availability?: string;
    location?: string;
  },
): boolean {
  const search = query.search?.trim().toLowerCase();
  const location = query.location?.trim().toLowerCase();
  return (
    (!search ||
      `${view.title ?? ""} ${view.item.name} ${view.item.description} ${view.item.category}`
        .toLowerCase()
        .includes(search)) &&
    (!query.category || view.item.category === query.category) &&
    (!query.accessType || view.accessType === query.accessType) &&
    (!query.condition ||
      view.item.condition.toLowerCase() === query.condition.toLowerCase()) &&
    (!query.availability ||
      query.availability === "All" ||
      view.availability === query.availability.toLowerCase()) &&
    (!location || view.location.toLowerCase().includes(location))
  );
}

function sortViews(views: ListingView[], sort?: string): ListingView[] {
  return [...views].sort((left, right) =>
    sort === "price"
      ? left.price - right.price
      : sort === "name"
        ? left.item.name.localeCompare(right.item.name)
        : right.createdAt.localeCompare(left.createdAt),
  );
}

export async function listPublishedListings(
  query: {
    search?: string;
    category?: string;
    accessType?: string;
    condition?: string;
    availability?: string;
    location?: string;
    sort?: string;
  } = {},
  viewerId?: string,
): Promise<ListingView[]> {
  if (getDatabaseMode() === "supabase")
    return listSupabaseListings(query, viewerId);
  if (getDatabaseMode() === "mock")
    return sortViews(
      [...mockListings.values()]
        .filter(
          (listing) =>
            listing.status === "active" &&
            listing.availability !== "unavailable" &&
            (!viewerId || listing.ownerId !== viewerId) &&
            matchesQuery(listing, query),
        )
        .map((listing) => sanitizePrivateLocationData(listing)),
      query.sort,
    );
  const filter: Record<string, unknown> = {
    status: "active",
    availability: { $ne: "unavailable" },
  };
  if (query.accessType) filter.accessType = query.accessType;
  const listings = await ListingModel.find(filter)
    .populate("item")
    .populate("owner")
    .lean();
  return sortViews(
    listings
      .map((listing) =>
        sanitizePrivateLocationData(
          toView(listing as unknown as Record<string, unknown>),
        ),
      )
      .filter(
        (listing) =>
          (!viewerId || listing.owner.id !== viewerId) &&
          matchesQuery(listing, query),
      ),
    query.sort,
  );
}

export async function listMyListings(
  ownerId: string,
  accessToken?: string,
): Promise<ListingView[]> {
  if (getDatabaseMode() === "supabase")
    return listMySupabaseListings(ownerId, accessToken);
  if (getDatabaseMode() === "mock")
    return sortViews(
      [...mockListings.values()].filter(
        (listing) => listing.ownerId === ownerId,
      ),
      "created",
    );
  const mongoId = await mongoOwnerId(ownerId);
  if (!mongoId) return [];
  const listings = await ListingModel.find({ owner: mongoId })
    .populate("item")
    .populate("owner")
    .lean();
  return sortViews(
    listings.map((listing) =>
      toView(listing as unknown as Record<string, unknown>),
    ),
    "created",
  );
}

export async function getListing(
  id: string,
  includePrivate = false,
  ownerId?: string,
  accessToken?: string,
): Promise<ListingView | null> {
  if (getDatabaseMode() === "supabase")
    return getSupabaseListing(
      id,
      includePrivate ? accessToken : undefined,
      includePrivate ? ownerId : undefined,
    );
  if (getDatabaseMode() === "mock") {
    const listing = mockListings.get(id);
    if (
      !listing ||
      (listing.status !== "active" &&
        (!includePrivate || listing.ownerId !== ownerId))
    )
      return null;
    return includePrivate && listing.ownerId === ownerId
      ? listing
      : sanitizePrivateLocationData(listing);
  }
  const filter: Record<string, unknown> = { _id: id };
  if (includePrivate && ownerId) {
    if (getDatabaseMode() === "mongo") {
      const mongoId = await mongoOwnerId(ownerId);
      if (!mongoId) return null;
      filter.owner = mongoId;
    }
  }
  if (!includePrivate) filter.status = "active";
  const listing = await ListingModel.findOne(filter)
    .populate("item")
    .populate("owner")
    .lean();
  if (!listing) return null;
  const view = toView(listing as unknown as Record<string, unknown>);
  return includePrivate ? view : sanitizePrivateLocationData(view);
}

export async function updateListing(
  id: string,
  ownerId: string,
  input: ListingUpdate,
  accessToken?: string,
): Promise<ListingView> {
  if (getDatabaseMode() === "supabase")
    return updateSupabaseListing(id, ownerId, input, accessToken);
  const current = await getListing(id, true, ownerId);
  if (!current) throw new Error("Listing not found.");
  if (current.owner.id !== ownerId)
    throw new Error("You cannot modify this listing.");
  const merged: ListingInput = {
    name: input.name ?? current.item.name,
    description: input.description ?? current.item.description,
    category: input.category ?? current.item.category,
    images: input.images ?? current.item.images,
    condition: input.condition ?? current.item.condition,
    capabilities: input.capabilities ?? current.item.capabilities,
    accessType: input.accessType ?? current.accessType,
    price: input.price ?? current.price,
    priceUnit: input.priceUnit ?? current.priceUnit,
    availability: input.availability ?? current.availability,
    availableFrom: input.availableFrom ?? current.availableFrom,
    availableUntil: input.availableUntil ?? current.availableUntil,
    location: input.location ?? current.location,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes ?? current.notes,
  };
  const validated = validateInput(merged);
  if (getDatabaseMode() === "mock") {
    const updated = viewFromInput(
      id,
      {
        id: ownerId,
        name: current.owner.name,
        email: "",
        emailVerified: false,
        phoneVerified: false,
        verificationStatus: "pending",
        trustSummary: {
          score: current.owner.trustScore,
          completedExchanges: 0,
          reviewCount: 0,
        },
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
      },
      merged,
      new Date().toISOString(),
    );
    updated.status = input.status ?? current.status;
    mockListings.set(id, updated);
    return updated;
  }
  const mongoId = await mongoOwnerId(ownerId);
  if (!mongoId) throw new Error("Listing not found.");
  const listing = await ListingModel.findOne({ _id: id, owner: mongoId });
  if (!listing) throw new Error("Listing not found.");
  const item = await ItemModel.findOneAndUpdate(
    { _id: listing.item, owner: mongoId },
    {
      $set: {
        name: merged.name.trim(),
        description: merged.description.trim(),
        category: merged.category.trim(),
        images: validated.images,
        condition: validated.condition,
        capabilities: validated.capabilities,
        "metadata.itemKey": canonicalItemKey(merged.name, merged.category),
        "metadata.notes": merged.notes?.trim(),
      },
    },
    { new: true, runValidators: true },
  );
  if (!item) throw new Error("Listing item not found.");
  listing.accessType = merged.accessType;
  listing.price = validated.price;
  listing.priceUnit = validated.priceUnit;
  listing.totalCost = validated.price;
  listing.availability = validated.availability;
  listing.availableFrom = merged.availableFrom ?? null;
  listing.availableUntil = merged.availableUntil ?? null;
  listing.location = merged.location.trim();
  const coordinates = inputCoordinates(merged);
  listing.locationPoint = coordinates
    ? pointForCoordinates(coordinates)
    : listing.locationPoint;
  listing.condition = validated.condition;
  listing.conditionScore = conditionScores[validated.condition];
  if (input.status) listing.status = input.status;
  await listing.save();
  return mongoView(
    (await ListingModel.findById(listing._id)
      .populate("item")
      .populate("owner")
      .lean()) as unknown as Record<string, unknown>,
  );
}

export async function removeListing(
  id: string,
  ownerId: string,
  accessToken?: string,
): Promise<void> {
  if (getDatabaseMode() === "supabase")
    return archiveSupabaseListing(id, ownerId, accessToken);
  const current = await getListing(id, true, ownerId);
  if (!current) throw new Error("Listing not found.");
  if (current.owner.id !== ownerId)
    throw new Error("You cannot modify this listing.");
  if (getDatabaseMode() === "mock") {
    const listing = mockListings.get(id)!;
    listing.status = "closed";
    listing.availability = "unavailable";
    mockListings.set(id, listing);
    return;
  }
  const mongoId = await mongoOwnerId(ownerId);
  if (!mongoId) throw new Error("Listing not found.");
  await ListingModel.updateOne(
    { _id: id, owner: mongoId },
    { $set: { status: "closed", availability: "unavailable" } },
  );
}

export function listingToAccessOption(
  listing: ListingView,
  userLocation?: Coordinates,
): AccessOption {
  const itemKey = canonicalItemKey(listing.item.name, listing.item.category);
  const listingPoint = (
    listing as { locationPoint?: { type?: string; coordinates?: number[] } }
  ).locationPoint;
  const fallbackCoordinates =
    listingPoint &&
    Array.isArray(listingPoint.coordinates) &&
    listingPoint.coordinates.length === 2
      ? {
          latitude: Number(listingPoint.coordinates[1]),
          longitude: Number(listingPoint.coordinates[0]),
        }
      : undefined;
  const coordinates = listing.locationCoordinates ?? fallbackCoordinates;
  const distanceKm =
    listing.distanceKm ??
    (userLocation && coordinates ? distanceInKm(userLocation, coordinates) : 0);
  const distanceBand: AccessOption["metadata"]["distanceBand"] =
    distanceKm <= 2
      ? "very-nearby"
      : distanceKm <= 5
        ? "nearby"
        : distanceKm <= 10
          ? "moderate"
          : "far";
  const source: AccessOption["metadata"]["source"] =
    listing.accessType === "borrow"
      ? "community"
      : listing.accessType === "rent"
        ? "local-provider"
        : listing.accessType === "buy-used"
          ? "marketplace"
          : "retailer";
  return {
    id: listing.id,
    itemId: itemKey,
    title: listing.item.name,
    accessMethod: listing.accessType,
    description: listing.item.description,
    provider: {
      name: listing.owner.name,
      initials: listing.owner.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      type:
        listing.accessType === "borrow"
          ? ("community-member" as const)
          : listing.accessType === "rent"
            ? ("rental-provider" as const)
            : listing.accessType === "buy-used"
              ? ("marketplace-seller" as const)
              : ("retailer" as const),
    },
    location: listing.location,
    distanceKm,
    availability: listing.availability,
    availableFrom: listing.availableFrom,
    availableUntil: listing.availableUntil,
    price: listing.price,
    priceUnit: listing.priceUnit,
    totalCost: listing.price,
    condition: listing.item.condition,
    conditionScore: conditionScores[listing.item.condition],
    trustScore: listing.owner.trustScore,
    convenienceScore: 50,
    usageSuitabilityScore: 70,
    capabilities: listing.item.capabilities,
    image: listing.item.images[0] ?? "",
    category: listing.item.category,
    metadata: { distanceBand, source, tags: ["user-listing"] },
  };
}

export function getConditionScore(condition: string): number {
  return conditionScores[condition as ListingCondition] ?? 0;
}
