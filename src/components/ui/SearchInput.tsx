import { Search } from 'lucide-react';
import { Input } from './Input';

type SearchInputProps = {
    placeholder?: string;
    className?: string;
};

export function SearchInput({ placeholder = 'Search items, categories, or people', className = '' }: SearchInputProps) {
    return (
        <div className={`relative ${className}`}>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input aria-label="Search" placeholder={placeholder} className="pl-11" />
        </div>
    );
}