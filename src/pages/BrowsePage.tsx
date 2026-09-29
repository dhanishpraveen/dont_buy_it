import { useDeferredValue, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ListingFilterPanel, type BrowseFilters } from '../components/items/ListingFilterPanel';
import { FilterChip } from '../components/items/FilterChip';
import { LiveListingCard } from '../components/items/LiveListingCard';
import { SearchBar } from '../components/items/SearchBar';
import { itemCategories } from '../data/mockItems';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getPublishedListings, type ListingView } from '../services/listingService';
import { useCachedResource } from '../hooks/useCachedResource';
import { cacheKeys, cacheTtl } from '../lib/localStorageCache';
import { useAuth } from '../context/AuthContext';

const emptyFilters = (category = 'All'): BrowseFilters => ({ location: '', availability: 'All', condition: 'All', category, accessType: 'all' });

export function BrowsePage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [filters, setFilters] = useState<BrowseFilters>(() => emptyFilters(searchParams.get('category') ?? 'All'));
    const [sort, setSort] = useState('newest');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const query = {
        search: deferredSearch.trim() || undefined,
        category: filters.category === 'All' ? undefined : filters.category,
        accessType: filters.accessType === 'all' ? undefined : filters.accessType,
        condition: filters.condition === 'All' ? undefined : filters.condition,
        availability: filters.availability === 'All' ? undefined : filters.availability,
        location: filters.location.trim() || undefined,
        sort,
    };
    const { data, loading, refreshing, error } = useCachedResource(
        cacheKeys.browse(query, user?.id),
        cacheTtl.listings,
        () => getPublishedListings(query),
    );
    const listings = data ?? [];

    const resetFilters = () => { setFilters(emptyFilters()); setSearch(''); setSort('newest'); };
    const accessLabel = filters.accessType === 'all' ? '' : filters.accessType.replace('-', ' ');
    const availabilityLabel = filters.availability === 'All' ? '' : filters.availability === 'PARTIALLY_AVAILABLE' ? 'Partially available' : 'Available';

    return <div>
        <SectionHeader title="Find what you need" description="Browse real listings shared by people in your community." />
        <div className="mb-7"><SearchBar value={search} onChange={setSearch} onFilterClick={() => setFiltersOpen(true)} /></div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1">{['All', ...itemCategories].map((category) => <button key={category} onClick={() => setFilters((current) => ({ ...current, category }))} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filters.category === category ? 'bg-bark text-surface' : 'bg-surface text-muted hover:bg-sage-soft hover:text-sage'}`}>{category}</button>)}</div>
        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
            <ListingFilterPanel filters={filters} onChange={setFilters} open={filtersOpen} onClose={() => setFiltersOpen(false)} />
            <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted">{loading ? 'Loading listings...' : `${listings.length} listings`}</span>
                        {availabilityLabel ? <FilterChip label={availabilityLabel} onRemove={() => setFilters((current) => ({ ...current, availability: 'All' }))} /> : null}
                        {filters.condition !== 'All' ? <FilterChip label={filters.condition} onRemove={() => setFilters((current) => ({ ...current, condition: 'All' }))} /> : null}
                        {accessLabel ? <FilterChip label={accessLabel} onRemove={() => setFilters((current) => ({ ...current, accessType: 'all' }))} /> : null}
                        {filters.location ? <FilterChip label={filters.location} onRemove={() => setFilters((current) => ({ ...current, location: '' }))} /> : null}
                    </div>
                    <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm text-muted">Sort<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-control border border-line bg-surface px-2 text-sm text-ink"><option value="newest">Newest</option><option value="price">Price: low to high</option><option value="name">Name</option></select></label><button type="button" onClick={resetFilters} className="text-sm font-semibold text-bark hover:underline">Reset</button></div>
                </div>
                {error ? <p className="mb-5 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
                {refreshing ? <p className="mb-3 text-xs text-muted" role="status">Updating listings...</p> : null}
                {loading ? <div className="py-20 text-center text-sm text-muted" role="status">Loading listings...</div> : listings.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <LiveListingCard key={listing.id} listing={listing} />)}</div> : <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center"><h2 className="font-display text-2xl font-semibold text-ink">No resources found.</h2><p className="mt-2 text-sm text-muted">Try changing your search or filters, or add the first listing.</p><Link to="/add-item"><Button className="mt-5">Create Listing</Button></Link></div>}
            </section>
        </div>
    </div>;
}