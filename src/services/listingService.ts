export type ListingView = {
    id: string;
    owner: { id: string; name: string; trustScore: number };
    item: { name: string; description: string; category: string; images: string[]; condition: string; capabilities: string[] };
    accessType: 'borrow' | 'rent' | 'buy-used' | 'buy-new';
    price: number;
    priceUnit: 'free' | 'per-day' | 'per-week' | 'one-time';
    availability: 'available' | 'partially-available' | 'unavailable';
    availableFrom: string | null;
    availableUntil: string | null;
    location: string;
    status: 'draft' | 'active' | 'paused' | 'closed';
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

type ListingResponse = { success: true; data: ListingView | ListingView[] } | { success: false; error?: string };

async function request(path: string, options?: RequestInit): Promise<ListingView | ListingView[]> {
    const response = await fetch(`/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } });
    const payload = await response.json() as ListingResponse;
    if (!response.ok || !payload.success) throw new Error(payload.success ? 'Listing request failed.' : payload.error ?? 'Listing request failed.');
    return payload.data;
}

export async function getPublishedListings(query = ''): Promise<ListingView[]> {
    return await request(`/listings${query}`) as ListingView[];
}

export async function getMyListings(): Promise<ListingView[]> {
    return await request('/users/me/listings') as ListingView[];
}

export async function getListing(id: string): Promise<ListingView> {
    return await request(`/listings/${encodeURIComponent(id)}`) as ListingView;
}

export async function createListing(input: Record<string, unknown>): Promise<ListingView> {
    return await request('/listings', { method: 'POST', body: JSON.stringify(input) }) as ListingView;
}

export async function updateListing(id: string, input: Record<string, unknown>): Promise<ListingView> {
    return await request(`/listings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }) as ListingView;
}

export async function deleteListing(id: string): Promise<void> {
    await request(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
