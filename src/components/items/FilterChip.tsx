import { X } from 'lucide-react';

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return <button onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-sage hover:bg-sage hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"><span>{label}</span><X size={13} aria-hidden="true" /></button>;
}