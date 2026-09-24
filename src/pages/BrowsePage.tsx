import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterPanel, type BrowseFilters } from '../components/items/FilterPanel';
import { FilterChip } from '../components/items/FilterChip';
import { ItemCard } from '../components/items/ItemCard';
import { SearchBar } from '../components/items/SearchBar';
import { itemCategories, mockItems } from '../data/mockItems';
import { SectionHeader } from '../components/ui/SectionHeader';

export function BrowsePage() {
    const [searchParams] = useSearchParams();
    const initialCategory = searchParams.get('category') ?? 'All';
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [filters, setFilters] = useState<BrowseFilters>({ location: '', availability: 'All', condition: 'All', category: initialCategory });
    const [sort, setSort] = useState('Newest');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const visibleItems = useMemo(() => {
        const normalizedSearch = search.toLowerCase().trim();
        const filtered = mockItems.filter((item) => (!normalizedSearch || `${item.name} ${item.category}`.toLowerCase().includes(normalizedSearch)) && (activeCategory === 'All' || item.category === activeCategory) && (filters.category === 'All' || item.category === filters.category) && (filters.availability === 'All' || item.availability === filters.availability) && (filters.condition === 'All' || item.condition === filters.condition) && (!filters.location || item.location.toLowerCase().includes(filters.location.toLowerCase())));
        return [...filtered].sort((a, b) => sort === 'Distance' ? a.distance - b.distance : sort === 'Most Popular' ? b.popularity - a.popularity : a.addedDaysAgo - b.addedDaysAgo);
    }, [activeCategory, filters, search, sort]);
    const chooseCategory = (category: string) => { setActiveCategory(category); setFilters((current) => ({ ...current, category })); };
    const resetFilters = () => { setActiveCategory('All'); setFilters({ location: '', availability: 'All', condition: 'All', category: 'All' }); setSearch(''); };
    return <div><SectionHeader title="Find what you need" description="Borrow useful things from people in your community." /><div className="mb-7"><SearchBar value={search} onChange={setSearch} onFilterClick={() => setFiltersOpen(true)} /></div><div className="mb-8 flex gap-2 overflow-x-auto pb-1">{['All', ...itemCategories].map((category) => <button key={category} onClick={() => chooseCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeCategory === category ? 'bg-bark text-surface' : 'bg-surface text-muted hover:bg-sage-soft hover:text-sage'}`}>{category}</button>)}</div><div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]"><FilterPanel filters={filters} onChange={setFilters} open={filtersOpen} onClose={() => setFiltersOpen(false)} /><section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted">{visibleItems.length} items</span>{filters.availability !== 'All' ? <FilterChip label={filters.availability} onRemove={() => setFilters({ ...filters, availability: 'All' })} /> : null}{filters.condition !== 'All' ? <FilterChip label={filters.condition} onRemove={() => setFilters({ ...filters, condition: 'All' })} /> : null}{filters.location ? <FilterChip label={filters.location} onRemove={() => setFilters({ ...filters, location: '' })} /> : null}</div><div className="flex items-center gap-2"><SlidersHorizontal size={15} className="text-muted lg:hidden" /><label className="flex items-center gap-2 text-sm text-muted">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-control border border-line bg-surface px-3 font-semibold text-ink outline-none focus:border-sage"><option>Newest</option><option>Distance</option><option>Most Popular</option></select><ChevronDown size={14} className="pointer-events-none -ml-7 mr-2 text-muted" /></label></div></div>{visibleItems.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <div className="rounded-card border border-dashed border-line bg-surface px-6 py-16 text-center"><h2 className="font-display text-2xl font-semibold">Nothing matches those filters yet.</h2><p className="mt-2 text-sm text-muted">Try a wider search or clear the filters to see more shared items.</p><button onClick={resetFilters} className="mt-5 text-sm font-semibold text-bark underline underline-offset-4">Clear all filters</button></div>}</section></div></div>;
}