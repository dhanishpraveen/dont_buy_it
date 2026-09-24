export type AccessMethod = 'borrow' | 'rent' | 'buy-used' | 'buy-new';
export type AvailabilityStatus = 'available' | 'partially-available' | 'unavailable';
export type PriceUnit = 'free' | 'per-day' | 'per-week' | 'one-time';
export type ProviderType = 'community-member' | 'rental-provider' | 'marketplace-seller' | 'retailer';

export type AccessProvider = {
    name: string;
    initials: string;
    type: ProviderType;
};

export type AccessOption = {
    id: string;
    itemId: string;
    title: string;
    accessMethod: AccessMethod;
    description: string;
    provider: AccessProvider;
    location: string;
    distanceKm: number;
    availability: AvailabilityStatus;
    availableFrom: string | null;
    availableUntil: string | null;
    price: number;
    priceUnit: PriceUnit;
    totalCost: number;
    condition: string;
    conditionScore: number;
    trustScore: number;
    convenienceScore: number;
    usageSuitabilityScore: number;
    capabilities: string[];
    image: string;
    category: string;
    metadata: {
        distanceBand: 'very-nearby' | 'nearby' | 'moderate' | 'far';
        source: 'community' | 'local-provider' | 'marketplace' | 'retailer';
        tags: string[];
    };
};