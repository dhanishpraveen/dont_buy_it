import { CircleCheck, Clock3 } from 'lucide-react';
import type { ItemAvailability } from '../../data/mockItems';

export function StatusBadge({ availability }: { availability: ItemAvailability }) {
    const available = availability === 'Available';
    return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${available ? 'text-sage' : 'text-muted'}`}><span className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-sage' : 'bg-muted/60'}`} />{available ? <CircleCheck size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{availability}</span>;
}