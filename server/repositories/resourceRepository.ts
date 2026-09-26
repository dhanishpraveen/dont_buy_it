import type { AccessOption, AccessMethod, ProviderType, PriceUnit, AvailabilityStatus } from '../../shared/types/accessOptions.js';
import type { UserRequirement } from '../../shared/types/requirements.js';
import { ListingModel } from '../models/Listing.js';

type ResourceDocument = {
    _id: unknown;
    accessType: AccessMethod;
    price: number;
    priceUnit: PriceUnit;
    totalCost: number;
    availability: AvailabilityStatus;
    availableFrom?: string | null;
    availableUntil?: string | null;
    location: string;
    distanceKm: number;
    condition: string;
    conditionScore: number;
    trustScore: number;
    convenienceScore: number;
    usageSuitabilityScore: number;
    metadata?: Record<string, unknown>;
    item?: {
        name: string;
        description: string;
        category: string;
        images?: string[];
        capabilities?: string[];
        metadata?: Record<string, unknown>;
    };
    owner?: { name?: string; trustSummary?: { score?: number } };
};

const normalize = (value: string) => value.toLowerCase().trim();
const itemAliases: Record<string, string[]> = {
    projector: ['projector', 'presentation', 'display'],
    laptop: ['laptop', 'computer', 'notebook'],
    camera: ['camera', 'photography', 'photo'],
    'camping-equipment': ['camp', 'camping', 'tent', 'outdoor'],
    drill: ['drill', 'holes', 'repair'],
    'ergonomic-chair': ['chair', 'desk', 'office', 'ergonomic'],
};

function matchesItem(itemKey: string, item: Pick<NonNullable<ResourceDocument['item']>, 'name' | 'category'>, requestedItem: string): boolean {
    const query = normalize(requestedItem);
    const alias = Object.entries(itemAliases).find(([, values]) => values.some((value) => query.includes(value)))?.[0];
    if (alias) return itemKey === alias;
    return `${itemKey} ${item?.name ?? ''} ${item?.category ?? ''}`.toLowerCase().includes(query);
}

function matchesCapabilities(capabilities: string[], requiredCapabilities: string[]): boolean {
    if (!requiredCapabilities.length) return true;
    return requiredCapabilities.some((required) => {
        const words = normalize(required).split(/\s+/).filter((word) => word.length > 3);
        return capabilities.some((capability) => words.some((word) => normalize(capability).includes(word)));
    });
}

function matchesLocation(location: string, requestedLocation: string | null): boolean {
    if (!requestedLocation || ['nearby', 'close', 'local'].some((term) => normalize(requestedLocation).includes(term))) return true;
    const requested = normalize(requestedLocation);
    return normalize(location).includes(requested) || (requested.includes('chennai') && normalize(location).includes('chennai'));
}

function matchesDate(resource: Pick<AccessOption, 'availability' | 'availableFrom'>, requestedDate: string | null): boolean {
    if (!requestedDate || resource.availability === 'partially-available' || !resource.availableFrom) return true;
    const requested = normalize(requestedDate);
    const available = normalize(resource.availableFrom);
    if (requested.includes('tomorrow')) return available.includes('tomorrow') || available.includes('today');
    if (requested.includes('today')) return available.includes('today');
    return true;
}

function providerType(accessType: AccessMethod): ProviderType {
    if (accessType === 'borrow') return 'community-member';
    if (accessType === 'rent') return 'rental-provider';
    if (accessType === 'buy-used') return 'marketplace-seller';
    return 'retailer';
}

function toAccessOption(resource: ResourceDocument): AccessOption | null {
    if (!resource.item) return null;
    const itemKey = typeof resource.item.metadata?.itemKey === 'string' ? resource.item.metadata.itemKey : String(resource.item.name).toLowerCase().replace(/\s+/g, '-');
    const metadata = resource.metadata ?? {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    const providerName = resource.owner?.name ?? 'Community provider';
    const distanceBand = resource.distanceKm <= 2 ? 'very-nearby' : resource.distanceKm <= 5 ? 'nearby' : resource.distanceKm <= 10 ? 'moderate' : 'far';
    const source = resource.accessType === 'borrow' ? 'community' : resource.accessType === 'rent' ? 'local-provider' : resource.accessType === 'buy-used' ? 'marketplace' : 'retailer';
    return {
        id: String(resource._id),
        itemId: itemKey,
        title: resource.item.name,
        accessMethod: resource.accessType,
        description: resource.item.description,
        provider: { name: providerName, initials: providerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), type: providerType(resource.accessType) },
        location: resource.location,
        distanceKm: resource.distanceKm,
        availability: resource.availability,
        availableFrom: resource.availableFrom ?? null,
        availableUntil: resource.availableUntil ?? null,
        price: resource.price,
        priceUnit: resource.priceUnit,
        totalCost: resource.totalCost,
        condition: resource.condition,
        conditionScore: resource.conditionScore,
        trustScore: resource.trustScore,
        convenienceScore: resource.convenienceScore,
        usageSuitabilityScore: resource.usageSuitabilityScore,
        capabilities: resource.item.capabilities ?? [],
        image: resource.item.images?.[0] ?? '',
        category: resource.item.category,
        metadata: { distanceBand, source, tags },
    };
}

async function loadResources(): Promise<AccessOption[]> {
    const listings = await ListingModel.find({ status: 'active', availability: { $ne: 'unavailable' } }).populate('item').populate('owner').lean();
    return listings.map((listing) => toAccessOption(listing as unknown as ResourceDocument)).filter((option): option is AccessOption => option !== null);
}

export async function findMatchingResources(requirement: UserRequirement): Promise<AccessOption[]> {
    if (!requirement.item?.trim()) return [];
    const resources = await loadResources();
    return resources.filter((option) => matchesItem(option.itemId, { name: option.title, category: option.category }, requirement.item ?? '') && matchesCapabilities(option.capabilities, requirement.requiredCapabilities) && matchesLocation(option.location, requirement.location) && matchesDate(option, requirement.date));
}

export async function listResources(): Promise<AccessOption[]> {
    return loadResources();
}

export async function findResourceById(id: string): Promise<AccessOption | null> {
    const listing = await ListingModel.findOne({ _id: id, status: 'active' }).populate('item').populate('owner').lean();
    return listing ? toAccessOption(listing as unknown as ResourceDocument) : null;
}

