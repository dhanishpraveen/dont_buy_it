import type { AccessOption } from "../../shared/types/accessOptions.js";
import type { UserRequirement } from "../../shared/types/requirements.js";
import { mockAccessOptions } from "../../shared/data/mockAccessOptions.js";
import { getDatabaseMode } from "../config/database.js";
import { findMatchingResources } from "../repositories/resourceRepository.js";
import { getNearbySupabaseListings } from "./supabaseListingService.js";
import {
  getListing,
  listPublishedListings,
  listingToAccessOption,
} from "./listingService.js";
import {
  findNearbyResources,
  findResourceById,
  listResources,
} from "../repositories/resourceRepository.js";
import type { Coordinates } from "./locationService.js";

const itemAliases: Record<string, string[]> = {
  projector: ["projector", "presentation", "display"],
  laptop: ["laptop", "computer", "notebook"],
  camera: ["camera", "photography", "photo"],
  "camping-equipment": ["camp", "camping", "tent", "outdoor"],
  drill: ["drill", "holes", "repair"],
  "ergonomic-chair": ["chair", "desk", "office", "ergonomic"],
};

const normalize = (value: string) => value.toLowerCase().trim();

function matchesItem(option: AccessOption, requestedItem: string): boolean {
  const query = normalize(requestedItem);
  const aliases = Object.entries(itemAliases).find(([, values]) =>
    values.some((value) => query.includes(value)),
  )?.[0];
  if (aliases) return option.itemId === aliases;
  return `${option.itemId} ${option.title} ${option.category}`
    .toLowerCase()
    .includes(query);
}

function matchesCapabilities(
  option: AccessOption,
  requiredCapabilities: string[],
): boolean {
  if (!requiredCapabilities.length) return true;
  return requiredCapabilities.some((required) => {
    const requiredWords = normalize(required)
      .split(/\s+/)
      .filter((word) => word.length > 3);
    return option.capabilities.some((capability) =>
      requiredWords.some((word) => normalize(capability).includes(word)),
    );
  });
}

function matchesLocation(
  option: AccessOption,
  location: string | null,
): boolean {
  if (
    !location ||
    ["nearby", "close", "local"].some((term) =>
      normalize(location).includes(term),
    )
  )
    return true;
  const requested = normalize(location);
  return (
    option.location.toLowerCase().includes(requested) ||
    (requested.includes("chennai") &&
      option.location.toLowerCase().includes("chennai"))
  );
}

function matchesDate(option: AccessOption, date: string | null): boolean {
  if (!date || option.availability === "partially-available") return true;
  if (!option.availableFrom) return true;
  const requested = normalize(date);
  const available = normalize(option.availableFrom);
  if (requested.includes("tomorrow"))
    return available.includes("tomorrow") || available.includes("today");
  if (requested.includes("today")) return available.includes("today");
  return true;
}

export function getAccessOptions(requirement: UserRequirement): AccessOption[] {
  if (!requirement.item?.trim()) return [];
  return mockAccessOptions.filter(
    (option) =>
      option.availability !== "unavailable" &&
      matchesItem(option, requirement.item ?? "") &&
      matchesCapabilities(option, requirement.requiredCapabilities) &&
      matchesLocation(option, requirement.location) &&
      matchesDate(option, requirement.date),
  );
}

export async function getAccessOptionsForRequest(
  requirement: UserRequirement,
): Promise<AccessOption[]> {
  if (getDatabaseMode() === "mongo") return findMatchingResources(requirement);
  if (!requirement.item?.trim()) return [];
  const listings =
    getDatabaseMode() === "supabase" && requirement.locationCoordinates
      ? await getNearbySupabaseListings(requirement.locationCoordinates)
      : await listPublishedListings();
  const userOptions = listings
    .map((listing) =>
      listingToAccessOption(
        listing,
        requirement.locationCoordinates ?? undefined,
      ),
    )
    .filter(
      (option) =>
        option.availability !== "unavailable" &&
        matchesItem(option, requirement.item ?? "") &&
        matchesCapabilities(option, requirement.requiredCapabilities) &&
        matchesLocation(option, requirement.location) &&
        matchesDate(option, requirement.date),
    );
  if (getDatabaseMode() === "supabase") return userOptions;
  const demoOptions = getAccessOptions(requirement);
  return [...demoOptions, ...userOptions];
}

export async function getAllAccessOptions(): Promise<AccessOption[]> {
  if (getDatabaseMode() === "mongo") return listResources();
  if (getDatabaseMode() === "supabase")
    return (await listPublishedListings()).map((listing) =>
      listingToAccessOption(listing),
    );
  return getAllMockAccessOptions();
}

export async function getNearbyAccessOptions(
  coordinates: Coordinates,
  radiusKm: number,
  filters: {
    category?: string;
    accessType?: string;
    availability?: string;
    limit?: number;
  } = {},
): Promise<AccessOption[]> {
  if (getDatabaseMode() === "mongo")
    return findNearbyResources(coordinates, radiusKm, filters);
  if (getDatabaseMode() === "supabase") {
    const listings = await getNearbySupabaseListings(coordinates, radiusKm);
    return listings
      .map((listing) => listingToAccessOption(listing, coordinates))
      .filter(
        (option) =>
          (!filters.category ||
            option.category.toLowerCase() === filters.category.toLowerCase()) &&
          (!filters.accessType || option.accessMethod === filters.accessType) &&
          (!filters.availability ||
            option.availability === filters.availability),
      )
      .slice(0, filters.limit ?? 50);
  }
  return getAllMockAccessOptions()
    .filter(
      (option) =>
        option.distanceKm <= radiusKm &&
        (!filters.category ||
          option.category.toLowerCase() === filters.category.toLowerCase()) &&
        (!filters.accessType || option.accessMethod === filters.accessType) &&
        (!filters.availability || option.availability === filters.availability),
    )
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, filters.limit ?? 50);
}

export async function getAccessOptionById(
  id: string,
): Promise<AccessOption | null> {
  if (getDatabaseMode() === "mongo") return findResourceById(id);
  if (getDatabaseMode() === "supabase") {
    const listing = await getListing(id);
    return listing ? listingToAccessOption(listing) : null;
  }
  return getAllMockAccessOptions().find((option) => option.id === id) ?? null;
}

export function getAllMockAccessOptions(): AccessOption[] {
  return mockAccessOptions.filter(
    (option) => option.availability !== "unavailable",
  );
}
