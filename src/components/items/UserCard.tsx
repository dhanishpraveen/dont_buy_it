import { MapPin } from 'lucide-react';
import type { MockItem } from '../../data/mockItems';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { TrustBadge } from './TrustBadge';

export function UserCard({ item }: { item: MockItem }) {
    return <Card className="p-5"><div className="flex items-center gap-3"><Avatar initials={item.ownerInitials} size="lg" /><div><h2 className="font-display text-xl font-semibold text-ink">{item.owner}</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={13} />{item.location}</p></div></div><div className="mt-4"><TrustBadge score={item.ownerTrust} /><p className="mt-3 text-sm leading-6 text-muted">“{item.ownerNote}”</p></div></Card>;
}