import { X } from 'lucide-react';
import { itemCategories } from '../../data/mockItems';
import { Divider } from '../ui/Divider';
import { IconButton } from '../ui/IconButton';

export type BrowseFilters = { location: string; availability: string; condition: string; category: string; accessType: string };
type FilterPanelProps = { filters: BrowseFilters; onChange: (filters: BrowseFilters) => void; open: boolean; onClose: () => void };

const availabilityOptions = [
    { value: 'All', label: 'Any availability' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'PARTIALLY_AVAILABLE', label: 'Partially available' },
];
const conditionOptions = ['All', 'New', 'Like new', 'Good', 'Fair', 'Poor', 'Well loved'];
const accessOptions = [
    { value: 'all', label: 'Any access type' },
    { value: 'borrow', label: 'Borrow' },
    { value: 'rent', label: 'Rent' },
    { value: 'buy-used', label: 'Buy used' },
    { value: 'buy-new', label: 'Buy new' },
];

export function ListingFilterPanel({ filters, onChange, open, onClose }: FilterPanelProps) {
    const update = (key: keyof BrowseFilters, value: string) => onChange({ ...filters, [key]: value });
    return <>
        <div className={`fixed inset-0 z-40 bg-ink/30 transition-opacity lg:hidden ${open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'}`} onClick={onClose} />
        <aside className={`fixed inset-y-0 left-0 z-50 w-[290px] overflow-y-auto bg-surface p-6 transition-transform lg:static lg:z-auto lg:block lg:w-auto lg:translate-x-0 lg:rounded-card lg:border lg:border-line lg:p-5 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-ink">Filter by</h2><IconButton label="Close filters" className="lg:hidden" onClick={onClose}><X size={18} /></IconButton></div>
            <Divider className="my-5" />
            <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Location</span><input value={filters.location} onChange={(event) => update('location', event.target.value)} placeholder="Any location" className="h-10 w-full rounded-control border border-line bg-canvas px-3 text-sm outline-none focus:border-sage" /></label>
            <Divider className="my-5" />
            <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Category</span><select value={filters.category} onChange={(event) => update('category', event.target.value)} className="h-10 w-full rounded-control border border-line bg-canvas px-3 text-sm outline-none focus:border-sage"><option value="All">All categories</option>{itemCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <Divider className="my-5" />
            <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Access type</span><select value={filters.accessType} onChange={(event) => update('accessType', event.target.value)} className="h-10 w-full rounded-control border border-line bg-canvas px-3 text-sm outline-none focus:border-sage">{accessOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <Divider className="my-5" />
            <fieldset><legend className="mb-3 text-sm font-semibold text-ink">Availability</legend><div className="grid gap-2">{availabilityOptions.map((option) => <label key={option.value} className="flex items-center gap-2 text-sm text-muted"><input type="radio" name="availability" checked={filters.availability === option.value} onChange={() => update('availability', option.value)} className="accent-sage" />{option.label}</label>)}</div></fieldset>
            <Divider className="my-5" />
            <fieldset><legend className="mb-3 text-sm font-semibold text-ink">Condition</legend><div className="grid gap-2">{conditionOptions.map((value) => <label key={value} className="flex items-center gap-2 text-sm text-muted"><input type="radio" name="condition" checked={filters.condition === value} onChange={() => update('condition', value)} className="accent-sage" />{value === 'All' ? 'Any condition' : value}</label>)}</div></fieldset>
        </aside>
    </>;
}