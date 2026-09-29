import { ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { formatListingPrice } from '../../lib/listingFormat';
import type { ListingView } from '../../services/listingService';

const methodLabel: Record<ListingView['accessType'], string> = { borrow: 'Borrow', rent: 'Rent', 'buy-used': 'Buy used', 'buy-new': 'Buy new' };

export function LiveListingCard({ listing }: { listing: ListingView }) {
    const image = listing.item.images[0];
    return <Link to={`/listing/${listing.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
        <Card className="overflow-hidden transition-shadow hover:shadow-soft">
            <div className="relative aspect-[4/3] overflow-hidden bg-canvas">{image ? <img src={image} alt={listing.item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-sm text-muted">No image added</div>}<span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-bold text-ink">{listing.item.category}</span><span className="absolute right-3 top-3 rounded-full bg-sage-soft px-3 py-1 text-[11px] font-bold text-sage">{methodLabel[listing.accessType]}</span></div>
            <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-display text-lg font-semibold leading-tight text-ink">{listing.title || listing.item.name}</h3><ArrowUpRight size={17} className="shrink-0 text-bark" /></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{listing.item.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><MapPin size={13} />{listing.location}</span>{listing.distanceKm !== undefined ? <span>{listing.distanceKm.toFixed(1)} km</span> : null}<span className="inline-flex items-center gap-1"><ShieldCheck size={13} className="text-sage" />{listing.item.condition}</span></div><p className="mt-3 text-sm font-semibold text-bark">{formatListingPrice(listing)}</p></div>
        </Card>
    </Link>;
}