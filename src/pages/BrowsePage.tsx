import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterPanel, type BrowseFilters } from '../components/items/FilterPanel';
import { FilterChip } from '../components/items/FilterChip';
import { ItemCard } from '../components/items/ItemCard';
import { ListingCard } from '../components/items/ListingCard';
import { SearchBar } from '../components/items/SearchBar';
import { itemCategories, mockItems } from '../data/mockItems';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getPublishedListings, type ListingView } from '../services/listingService';

export function BrowsePage() {
    const [searchParams] = useSearchParams();
    const initialCategory = searchParams.get('category') ?? 'All';
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [filters, setFilters] = useState<BrowseFilters>({ location: '', availability: 'All', condition: 'All', category: initialCategory });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [publishedListings, setPublishedListings] = useState<ListingView[]>([]);

    useEffect(() => {
        getPublishedListings().then(setPublishedListings).catch(() => setPublishedListings([]));
    }, []);

    const normalizedSearch = search.toLowerCase().trim();
    const visibleItems = useMemo(() => mockItems.filter((item) => {
        const matchesSearch = !normalizedSearch || `${item.name} ${item.category}`.toLowerCase().includes(normalizedSearch);
        return matchesSearch && (activeCategory === 'All' || item.category === activeCategory) && (filters.category === 'All' || item.category === filters.category) && (filters.availability === 'All' || item.availability === filters.availability) && (filters.condition === 'All' || item.condition === filters.condition) && (!filters.location || item.location.toLowerCase().includes(filters.location.toLowerCase()));
    }), [activeCategory, filters, normalizedSearch]);

    const visibleListings = publishedListings.filter((listing) => {
        const matchesSearch = !normalizedSearch || `${listing.item.name} ${listing.item.category} ${listing.item.description}`.toLowerCase().includes(normalizedSearch);
        return matchesSearch && (activeCategory === 'All' || listing.item.category === activeCategory) && (filters.condition === 'All' || listing.item.condition === filters.condition) && (!filters.location || listing.location.toLowerCase().includes(filters.location.toLowerCase()));
    });

    const chooseCategory = (category: string) => { setActiveCategory(category); setFilters((current) => ({ ...current, category })); };
    const resetFilters = () => { setActiveCategory('All'); setFilters({ location: '', availability: 'All', condition: 'All', category: 'All' }); setSearch(''); };

    return <div>
        <SectionHeader title="Find what you need" description="Borrow useful things from people in your community." />
        <div className="mb-7"><SearchBar value={search} onChange={setSearch} onFilterClick={() => setFiltersOpen(true)} /></div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1">{['All', ...itemCategories].map((category) => <button key={category} onClick={() => chooseCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeCategory === category ? 'bg-bark text-surface' : 'bg-surface text-muted hover:bg-sage-soft hover:text-sage'}`}>{category}</button>)}</div>
        {visibleListings.length ? <section className="mb-10"><SectionHeader title="Community listings" description="Published by people sharing what they already have." /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div></section> : null}
        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
            <FilterPanel filters={filters} onChange={setFilters} open={filtersOpen} onClose={() => setFiltersOpen(false)} />
            <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted">{visibleItems.length} demo items</span>{filters.availability !== 'All' ? <FilterChip label={filters.availability} onRemove={() => setFilters({ ...filters, availability: 'All' })} /> : null}{filters.condition !== 'All' ? <FilterChip label={filters.condition} onRemove={() => setFilters({ ...filters, condition: 'All' })} /> : null}{filters.location ? <FilterChip label={filters.location} onRemove={() => setFilters({ ...filters, location: '' })} /> : null}</div><button type="button" onClick={resetFilters} className="text-sm font-semibold text-bark hover:underline">Reset filters</button></div>
                {visibleItems.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center"><h2 className="font-display text-2xl font-semibold text-ink">No matching items found</h2><p className="mt-2 text-sm text-muted">Try changing your search or filters.</p></div>}
            </section>
        </div>
    </div>;
}
