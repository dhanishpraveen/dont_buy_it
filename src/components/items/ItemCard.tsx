import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MockItem } from '../../data/mockItems';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';

export function ItemCard({ item }: { item: MockItem }) {
    return <Link to={`/item/${item.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
        <Card className="overflow-hidden transition-shadow hover:shadow-soft">
            <div className="relative aspect-[4/3] overflow-hidden bg-canvas"><img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /><span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-bold text-ink">{item.category}</span><span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-bark opacity-0 transition-opacity group-hover:opacity-100"><ArrowUpRight size={16} aria-hidden="true" /></span></div>
            <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-display text-lg font-semibold leading-tight text-ink">{item.name}</h3><StatusBadge availability={item.availability} /></div><div className="mt-3 flex items-center gap-2"><Avatar initials={item.ownerInitials} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{item.owner}</p><p className="flex items-center gap-1 text-xs text-muted"><MapPin size={11} aria-hidden="true" />{item.distance} km away</p></div></div></div>
        </Card>
    </Link>;
}