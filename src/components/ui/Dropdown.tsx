import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type DropdownProps = {
    label: string;
    children: ReactNode;
};

export function Dropdown({ label, children }: DropdownProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={label || 'Open menu'}
                className="inline-flex items-center gap-2 rounded-control px-2 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sage-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                onClick={() => setOpen((current) => !current)}
            >
                {label}
                <ChevronDown aria-hidden="true" size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {open ? <div className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-card border border-line bg-surface p-2 shadow-soft" role="menu">{children}</div> : null}
        </div>
    );
}