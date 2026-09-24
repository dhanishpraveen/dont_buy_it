import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';

type SearchBarProps = { value: string; onChange: (value: string) => void; onFilterClick?: () => void; placeholder?: string };

export function SearchBar({ value, onChange, onFilterClick, placeholder = 'What do you need to borrow?' }: SearchBarProps) {
    return <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label="Search items" className="pl-11" /></div>{onFilterClick ? <IconButton label="Open filters" className="border border-line bg-surface lg:hidden" onClick={onFilterClick}><SlidersHorizontal size={18} /></IconButton> : null}</div>;
}