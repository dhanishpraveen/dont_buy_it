import { ArrowLeft, CalendarClock, MapPin, Pencil, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from '../lib/listingFormat';
import { getListing, type ListingView } from '../services/listingService';
import { useCachedResource } from '../hooks/useCachedResource';
import { cacheKeys, cacheTtl } from '../lib/localStorageCache';

const methodLabel: Record<ListingView['accessType'], string> = { borrow: 'Borrow', rent: 'Rent', 'buy-used': 'Buy used', 'buy-new': 'Buy new' };
const availabilityLabel: Record<ListingView['availability'], string> = { available: 'Available', 'partially-available': 'Partially available', unavailable: 'Unavailable' };

function dateLabel(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function LiveListingDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: listing, loading, refreshing, error } = useCachedResource(
        cacheKeys.listing(id ?? 'missing', user?.id),
        cacheTtl.listingDetails,
        () => {
            if (!id) throw new Error('Listing not found.');
            return getListing(id);
        },
    );

    if (loading) return <div className="py-20 text-center text-sm text-muted" role="status">Loading listing...</div>;
    if (!listing) return <div className="py-20 text-center"><h1 className="font-display text-3xl font-semibold text-ink">Listing not found</h1><p className="mt-2 text-sm text-muted">{error ?? 'It may have been archived or is no longer available.'}</p><Link to="/browse" className="mt-4 inline-block text-sm font-semibold text-bark underline">Back to browse</Link></div>;

    const isOwner = Boolean(user && listing.owner.id && user.id === listing.owner.id);
    const canRequest = !isOwner && listing.status === 'active' && listing.availability !== 'unavailable';
    const image = listing.item.images[0];
    const availableFrom = dateLabel(listing.availableFrom);
    const availableUntil = dateLabel(listing.availableUntil);
    return <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-bark"><ArrowLeft size={16} />Back</button>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>{image ? <img src={image} alt={listing.item.name} className="aspect-[4/3] w-full rounded-card object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-sage-soft text-sm text-muted">No image added</div>}<div className="mt-6 flex flex-wrap gap-3">{listing.item.images.slice(1).map((src) => <img key={src} src={src} alt="" className="h-20 w-20 rounded-control object-cover" />)}</div></div>
            <div>
                {refreshing ? <p className="mb-3 text-xs text-muted" role="status">Refreshing listing...</p> : null}
                {error ? <p className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-800" role="status">Showing saved listing data. {error}</p> : null}
                <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-bold text-sage">{methodLabel[listing.accessType]}</span><span className="text-sm font-semibold text-muted">{listing.status === 'active' ? 'Published' : listing.status}</span></div>
                <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink">{listing.title || listing.item.name}</h1>
                {listing.title && listing.title !== listing.item.name ? <p className="mt-2 text-sm font-semibold text-muted">Item: {listing.item.name}</p> : null}
                <p className="mt-4 text-base leading-7 text-muted">{listing.item.description}</p>
                <div className="mt-6 grid gap-3 text-sm text-muted"><span className="flex items-center gap-2"><MapPin size={16} className="text-sage" />{listing.location}{listing.distanceKm !== undefined ? ` · ${listing.distanceKm.toFixed(1)} km away` : ''}</span><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-sage" />{listing.item.condition}</span><span>{availabilityLabel[listing.availability]}</span>{availableFrom || availableUntil ? <span className="flex items-center gap-2"><CalendarClock size={16} className="text-sage" />{availableFrom ? `From ${availableFrom}` : 'Available now'}{availableUntil ? ` to ${availableUntil}` : ''}</span> : null}</div>
                <p className="mt-7 font-display text-2xl font-semibold text-bark">{formatListingPrice(listing)}</p>
                {listing.deposit ? <p className="mt-1 text-sm text-muted">Deposit: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: listing.currency ?? 'INR' }).format(listing.deposit)}</p> : null}
                <Card className="mt-7 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Listed by</p><p className="mt-2 font-display text-xl font-semibold text-ink">{listing.owner.name}</p></Card>
                {isOwner ? <Link to={`/listings/${listing.id}/edit`}><Button className="mt-5"><Pencil size={16} />Edit listing</Button></Link> : null}
                {canRequest ? <Link to={`/request-access/${listing.id}`}><Button className="mt-5">{listing.accessType === 'borrow' ? 'Request to Borrow' : listing.accessType === 'rent' ? 'Request to Rent' : 'Request to Buy'}</Button></Link> : null}
            </div>
        </div>
    </div>;
}